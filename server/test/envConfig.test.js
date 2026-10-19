import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Import in a fresh process so dotenv and the startup validator run exactly as
// they do on Vercel, without reading the developer's local credentials.
const loadConfig = (variables) => {
  const environment = {
    ...process.env,
    VERCEL: "1",
    NODE_ENV: "test",
    JWT_SECRET_KEY: "controlled-config-test-secret",
  };
  delete environment.MONGODB_URI;
  delete environment.MONGODB_ATLAS_URI;
  Object.assign(environment, variables);
  const directory = mkdtempSync(path.join(tmpdir(), "news-env-test-"));
  try {
    return spawnSync(process.execPath, ["--input-type=module", "-e", `
      const { default: env } = await import(${JSON.stringify(new URL("../src/config/env.js", import.meta.url).href)});
      if (env.MONGODB_URI !== process.env.EXPECTED_URI) process.exit(2);
      if (process.env.EXPECTED_URI) {
        const { default: assert } = await import("node:assert/strict");
        const { default: mongoose } = await import(${JSON.stringify(new URL("../node_modules/mongoose/index.js", import.meta.url).href)});
        let connected = false;
        mongoose.connect = async (uri, options) => {
          connected = true;
          assert.equal(uri, process.env.EXPECTED_URI);
          assert.equal(options.dbName, process.env.EXPECTED_DB_NAME);
          return mongoose;
        };
        const { default: connectDatabase } = await import(${JSON.stringify(new URL("../src/config/database.js", import.meta.url).href)});
        await connectDatabase();
        assert.equal(connected, true);
      }
    `], { cwd: directory, env: environment, encoding: "utf8" });
  } finally {
    rmdirSync(directory);
  }
};

test("development uses Atlas and selects nsemfoa_data even with a legacy local URI", () => {
  const result = loadConfig({
    NODE_ENV: "development",
    MONGODB_URI: "mongodb://local.example.test/newsfront_db",
    MONGODB_ATLAS_URI: "mongodb://atlas.example.test/news",
    EXPECTED_URI: "mongodb://atlas.example.test/news",
    EXPECTED_DB_NAME: "nsemfoa_data",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /Missing required environment variable/);
});

test("isolated tests use their disposable URI without a database override", () => {
  const result = loadConfig({
    MONGODB_URI: "mongodb://canonical.example.test/news",
    MONGODB_ATLAS_URI: "mongodb://atlas.example.test/news",
    EXPECTED_URI: "mongodb://canonical.example.test/news",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("development requires MONGODB_ATLAS_URI instead of silently using old local data", () => {
  const result = loadConfig({
    NODE_ENV: "development",
    MONGODB_URI: "mongodb://local.example.test/newsfront_db",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Missing required environment variable "MONGODB_ATLAS_URI"/);
});

test("production uses the Atlas URI and selects nsemfoa_data", () => {
  const result = loadConfig({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://local.example.test/local_data",
    MONGODB_ATLAS_URI: "mongodb://atlas.example.test/previous_database",
    EXPECTED_URI: "mongodb://atlas.example.test/previous_database",
    EXPECTED_DB_NAME: "nsemfoa_data",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /Missing required environment variable/);
});

test("production warns when MONGODB_ATLAS_URI is missing", () => {
  const result = loadConfig({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://local.example.test/local_data",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Missing required environment variable "MONGODB_ATLAS_URI"/);
});

test("a missing connection still produces a startup configuration warning", () => {
  const result = loadConfig({});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Missing required environment variable "MONGODB_URI"/);
});
