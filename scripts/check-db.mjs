import nextEnv from "@next/env";
import pg from "pg";
import { getDatabasePoolConfig, getDatabaseErrorHint } from "../src/lib/database-config.mjs";

// Use the same .env precedence as Next, with shell variables taking priority.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

let pool;
try {
  const config = getDatabasePoolConfig(process.env);
  pool = new pg.Pool({ ...config, max: 1, query_timeout: 10_000 });
  await pool.query("SELECT 1");
  // Check the columns required for OAuth lookup and database sessions, without
  // reading account data or modifying the production database.
  await pool.query('SELECT "id" FROM "User" LIMIT 0');
  await pool.query('SELECT "provider", "providerAccountId", "userId" FROM "Account" LIMIT 0');
  await pool.query('SELECT "sessionToken", "userId", "expires" FROM "Session" LIMIT 0');
  console.log("Database connection and authentication tables are accessible.");
} catch (error) {
  console.error(`Database check failed. ${getDatabaseErrorHint(error)}`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
