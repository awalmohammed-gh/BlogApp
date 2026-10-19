import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { migrateDatabase } from "../src/scripts/migrateDatabase.js";
import { settingsDefaults } from "../src/config/settingsDefaults.js";

process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(".cache/mongodb");

test("Atlas transfer preserves BSON, article relationships, indexes and existing data", { timeout: 60000 }, async (t) => {
  const memory = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "7.0.14" } });
  const client = new mongoose.mongo.MongoClient(memory.getUri());
  const backupDir = await fs.mkdtemp(path.join(os.tmpdir(), "news-migration-test-"));
  t.after(async () => {
    await client.close();
    await memory.stop();
    for (const file of await fs.readdir(backupDir)) await fs.unlink(path.join(backupDir, file));
    await fs.rmdir(backupDir);
  });
  await client.connect();
  const source = client.db("migration_source");
  const target = client.db("migration_target");
  const id = new mongoose.mongo.ObjectId();
  const author = new mongoose.mongo.ObjectId();
  await source.collection("admins").insertOne({ _id: author, name: "Controlled Author", passwordHash: "controlled-hash" });
  await source.collection("articles").insertOne({ _id: id, slug: "controlled-story", author, publishedAt: new Date("2026-10-01T00:00:00Z"), version: mongoose.mongo.BSON.Long.fromNumber(9) });
  await source.collection("articles").createIndex({ slug: 1 }, { unique: true });
  await source.createCollection("emptycollection");
  const options = { source, target, backupDir, log: () => {} };

  const preview = await migrateDatabase(options);
  assert.equal(preview.plan.collections.find((item) => item.name === "articles").toCopy, 1);
  assert.equal(await target.collection("articles").countDocuments(), 0);
  assert.deepEqual(await fs.readdir(backupDir), []);

  const first = await migrateDatabase({ ...options, apply: true });
  assert.equal(first.result.verified, 2);
  assert.equal(first.result.inserted, 2);
  const copied = await target.collection("articles").findOne({ _id: id }, { promoteLongs: false });
  assert.equal(copied.author.toHexString(), author.toHexString());
  assert.equal(copied.publishedAt.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.ok(mongoose.mongo.BSON.Long.isLong(copied.version));
  assert.ok((await target.listCollections({ name: "emptycollection" }).toArray()).length);
  assert.equal((await target.collection("articles").indexes()).find((item) => item.name === "slug_1").unique, true);
  const backup = mongoose.mongo.BSON.EJSON.parse(await fs.readFile(first.result.backupFile, "utf8"), { relaxed: false });
  assert.equal(backup.collections.find((item) => item.name === "articles").documents[0]._id.toHexString(), id.toHexString());

  const second = await migrateDatabase({ ...options, apply: true });
  assert.equal(second.result.inserted, 0);
  assert.equal(await source.collection("articles").countDocuments(), 1);

  await target.collection("articles").updateOne({ _id: id }, { $set: { slug: "edited-on-target" } });
  await assert.rejects(migrateDatabase({ ...options, apply: true }), /Conflicting document/);
  assert.equal((await target.collection("articles").findOne({ _id: id })).slug, "edited-on-target");
  assert.equal((await source.collection("articles").findOne({ _id: id })).slug, "controlled-story");

  const sourceSettings = client.db("settings_source");
  const targetSettings = client.db("settings_target");
  const now = new Date();
  await sourceSettings.collection("sitesettings").insertOne({ key: "global", version: 7, values: { ...settingsDefaults, general: { ...settingsDefaults.general, tagline: "Existing site settings" } }, createdAt: now, updatedAt: now });
  await targetSettings.collection("sitesettings").insertOne({ key: "global", version: 0, values: settingsDefaults, updatedBy: null, createdAt: now, updatedAt: now });
  const settingsOptions = { source: sourceSettings, target: targetSettings, backupDir, log: () => {} };
  await assert.rejects(migrateDatabase({ ...settingsOptions, apply: true }), /unrelated records/);
  const settingsCopy = await migrateDatabase({ ...settingsOptions, apply: true, replaceDefaultSettings: true });
  assert.equal(settingsCopy.result.verified, 1);
  assert.equal((await targetSettings.collection("sitesettings").findOne()).version, 7);
  assert.equal(await targetSettings.collection("sitesettings").countDocuments(), 1);
  const settingsBackup = mongoose.mongo.BSON.EJSON.parse(await fs.readFile(settingsCopy.result.backupFile, "utf8"));
  assert.equal(settingsBackup.collections[0].defaultSettings.version, 0);
});
