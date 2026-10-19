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
    `], { cwd: directory, env: environment, encoding: "utf8" });
  } finally {
    rmdirSync(directory);
  }
};

test("Vercel starts with only the Atlas connection variable configured", () => {
  const result = loadConfig({
    MONGODB_ATLAS_URI: "mongodb://atlas.example.test/news",
    EXPECTED_URI: "mongodb://atlas.example.test/news",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /Missing required environment variable/);
});

test("the canonical connection variable takes precedence over the Atlas alias", () => {
  const result = loadConfig({
    MONGODB_URI: "mongodb://canonical.example.test/news",
    MONGODB_ATLAS_URI: "mongodb://atlas.example.test/news",
    EXPECTED_URI: "mongodb://canonical.example.test/news",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("a missing connection still produces a startup configuration warning", () => {
  const result = loadConfig({});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Missing required environment variable "MONGODB_URI"/);
});
