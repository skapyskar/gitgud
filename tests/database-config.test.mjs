import assert from "node:assert/strict";
import test from "node:test";
import { getDatabasePoolConfig, getDatabaseErrorHint } from "../src/lib/database-config.mjs";

test("rejects a shared pooler username without the project reference", () => {
  assert.throws(
    () => getDatabasePoolConfig({ DATABASE_URL: "postgresql://postgres:secret@aws-1-us-east-2.pooler.supabase.com:6543/postgres" }),
    /DATABASE_URL.*role\.project-ref/,
  );
});

test("preserves the copied pooler host, custom role, and encoded password with verified TLS", () => {
  const config = getDatabasePoolConfig({
    DATABASE_URL: "postgresql://app_user.projectref:p%40ss%3Aword@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&sslrootcert=unused&sslcert=unused&sslkey=unused&application_name=gitgud",
    DATABASE_CA_CERT: "test-ca",
  });
  const url = new URL(config.connectionString);
  assert.equal(url.hostname, "aws-1-us-east-2.pooler.supabase.com");
  assert.equal(url.username, "app_user.projectref");
  assert.equal(decodeURIComponent(url.password), "p@ss:word");
  assert.equal(url.port, "6543");
  assert.equal(url.search, "?application_name=gitgud");
  assert.deepEqual(config.ssl, { ca: "test-ca", rejectUnauthorized: true });
});

test("accepts direct connections without a shared-pooler username", () => {
  const config = getDatabasePoolConfig({ DATABASE_URL: "postgres://postgres:password@localhost:5432/gitgud" });
  assert.equal(new URL(config.connectionString).username, "postgres");
});

test("bounds connection attempts so an unavailable database cannot hang login indefinitely", () => {
  const config = getDatabasePoolConfig({ DATABASE_URL: "postgres://postgres:password@localhost:5432/gitgud" });
  assert.equal(config.connectionTimeoutMillis, 10_000);
});

test("reports invalid configuration without including the URL or password", () => {
  for (const DATABASE_URL of [undefined, "", "https://user:secret@example.com/db", "postgresql://user:secret%ZZ@localhost/db"]) {
    assert.throws(() => getDatabasePoolConfig({ DATABASE_URL }), (error) => {
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, /secret|postgresql:\/\/|https:\/\//);
      assert.equal(error.input, undefined);
      return true;
    });
  }
});

test("identifies the reported Supavisor tenant error without reflecting connection details", () => {
  const hint = getDatabaseErrorHint(new Error("(ENOTFOUND) tenant/user postgres.projectref not found"));
  assert.match(hint, /pooler host.*username/i);
  assert.doesNotMatch(hint, /postgres\.projectref/);
  assert.doesNotMatch(getDatabaseErrorHint(new Error("private-password")), /private-password/);
});
