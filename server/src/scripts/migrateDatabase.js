import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { settingsDefaults } from "../config/settingsDefaults.js";

const { MongoClient, BSON } = mongoose.mongo;
const readOptions = { promoteValues: false, promoteLongs: false };
const documentKey = (id) => BSON.EJSON.stringify([id], { relaxed: false });

// Copy raw BSON rather than models: preserve IDs, references, dates, password
// hashes, revisions and settings without running setters or publishing drafts.
export async function migrateDatabase({ source, target, apply = false, replaceDefaultSettings = false, backupDir = path.resolve("backups"), log = console.log }) {
  if (source.databaseName === target.databaseName) throw new Error("Source and target must have different database names.");
  const collections = (await source.listCollections().toArray()).filter((item) => !item.name.startsWith("system."));
  const targetCollections = new Map((await target.listCollections().toArray()).map((item) => [item.name, item]));
  const snapshots = [];
  for (const collection of collections) {
    if (collection.type !== "collection") throw new Error(`Unsupported source collection type: ${collection.name}`);
    const documents = await source.collection(collection.name).find({}, readOptions).toArray();
    const indexes = await source.collection(collection.name).indexes();
    const targetDocuments = await target.collection(collection.name).find({}, readOptions).toArray();
    // The running app may initialize a pristine settings singleton in an empty
    // database. Only an explicitly requested, unchanged default can be replaced.
    const candidate = targetDocuments[0];
    const defaultSettings = replaceDefaultSettings && collection.name === "sitesettings" && documents.length === 1 && targetDocuments.length === 1
      && documents[0].key === "global" && candidate.key === "global" && Number(candidate.version) === 0
      && !candidate.updatedBy && candidate.createdAt?.getTime() === candidate.updatedAt?.getTime()
      && isDeepStrictEqual(BSON.EJSON.serialize(candidate.values, { relaxed: true }), settingsDefaults)
      && !isDeepStrictEqual(candidate._id, documents[0]._id) ? candidate : null;
    const targetById = new Map(targetDocuments.map((document) => [documentKey(document._id), document]));
    let existing = 0;
    for (const document of documents) {
      const current = targetById.get(documentKey(document._id));
      if (current && !isDeepStrictEqual(current, document)) {
        throw new Error(`Conflicting document in ${collection.name}; no existing data will be overwritten.`);
      }
      if (current) existing += 1;
    }
    // Stop before copying anything if the destination already contains unrelated
    // documents. A partially completed copy can safely resume by its original IDs.
    if (targetDocuments.length !== existing + (defaultSettings ? 1 : 0)) throw new Error(`Destination ${collection.name} contains unrelated records; review before merging.`);
    if (targetCollections.has(collection.name) && !isDeepStrictEqual(targetCollections.get(collection.name).options, collection.options)) {
      throw new Error(`Collection options differ for ${collection.name}.`);
    }
    snapshots.push({ name: collection.name, options: collection.options, indexes, documents, existing, defaultSettings });
  }

  const plan = {
    mode: apply ? "apply" : "preview", source: source.databaseName, target: target.databaseName,
    collections: snapshots.map(({ name, documents, existing, indexes, defaultSettings }) => ({ name, source: documents.length, alreadyCopied: existing, toCopy: documents.length - existing, indexes: indexes.length, replacePristineDefaults: Boolean(defaultSettings) })),
  };
  log(JSON.stringify(plan, null, 2));
  if (!apply) return { plan };

  await fs.mkdir(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `database-before-atlas-${Date.now()}.ejson`);
  await fs.writeFile(backupFile, BSON.EJSON.stringify({ createdAt: new Date(), source: source.databaseName, target: target.databaseName, collections: snapshots }, { relaxed: false }), { flag: "wx", mode: 0o600 });
  log(`Source backup saved: ${backupFile}`);

  let inserted = 0;
  for (const snapshot of snapshots) {
    const { name, options, documents, indexes } = snapshot;
    if (!targetCollections.has(name)) await target.createCollection(name, options);
    const collection = target.collection(name);
    // Preserve all source indexes, including unique, partial and TTL indexes.
    for (const index of indexes.filter((item) => item.name !== "_id_")) {
      const { key, v, ns, ...indexOptions } = index;
      await collection.createIndex(key, indexOptions);
    }
    if (snapshot.defaultSettings) {
      const session = target.client.startSession();
      try {
        await session.withTransaction(async () => {
          const removed = await collection.deleteOne(snapshot.defaultSettings, { session });
          if (removed.deletedCount !== 1) throw new Error("Default settings changed during migration; no settings were replaced.");
          await collection.insertOne(documents[0], { session });
        });
        inserted += 1;
      } finally { await session.endSession(); }
      continue;
    }
    for (let offset = 0; offset < documents.length; offset += 100) {
      const result = await collection.bulkWrite(documents.slice(offset, offset + 100).map((document) => ({
        updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
      })), { ordered: true });
      inserted += result.upsertedCount;
    }
  }

  // Verify every copied BSON document rather than relying only on counts.
  for (const { name, documents } of snapshots) {
    const copiedDocuments = await target.collection(name).find({}, readOptions).toArray();
    const copiedById = new Map(copiedDocuments.map((document) => [documentKey(document._id), document]));
    for (const document of documents) {
      const copied = copiedById.get(documentKey(document._id));
      if (!isDeepStrictEqual(copied, document)) throw new Error(`Verification failed for ${name}. Source and backup remain intact.`);
    }
  }
  const result = { inserted, verified: snapshots.reduce((total, item) => total + item.documents.length, 0), collections: snapshots.length, backupFile };
  log(JSON.stringify(result, null, 2));
  return { plan, result };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config();
  let sourceClient;
  let targetClient;
  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_ATLAS_URI) throw new Error("Set legacy MONGODB_URI for the source and MONGODB_ATLAS_URI for the destination.");
    sourceClient = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    targetClient = new MongoClient(process.env.MONGODB_ATLAS_URI, { serverSelectionTimeoutMS: 10000 });
    await sourceClient.connect();
    await targetClient.connect();
    await migrateDatabase({ source: sourceClient.db(), target: targetClient.db("nsemfoa_data"), apply: process.argv.includes("--apply"), replaceDefaultSettings: process.argv.includes("--replace-default-settings") });
  } catch (error) {
    // Driver errors can contain connection details; never print a URI or document.
    console.error(`[Migration failed] ${error.name}: ${error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[connection string redacted]")}`);
    process.exitCode = 1;
  } finally {
    await sourceClient?.close();
    await targetClient?.close();
  }
}
