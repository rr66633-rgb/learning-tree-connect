#!/usr/bin/env node
/**
 * Database Setup Script for Naashah
 * 
 * This script applies all Drizzle migrations in order to set up the database schema.
 * Run this once when deploying to a new environment.
 * 
 * Usage:
 *   DATABASE_URL=mysql://... node scripts/db-setup.mjs
 * 
 * Or with .env file:
 *   node -e "require('dotenv').config()" scripts/db-setup.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(__dirname, "..", "drizzle");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const connection = await mysql.createConnection(dbUrl);

  try {
    // Create migrations tracking table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hash VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);

    // Get already applied migrations
    const [applied] = await connection.execute(
      "SELECT hash FROM __drizzle_migrations ORDER BY id"
    );
    const appliedHashes = new Set((applied).map((r) => r.hash));

    // Get all migration SQL files in order
    const sqlFiles = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${sqlFiles.length} migration files`);
    console.log(`Already applied: ${appliedHashes.size}`);

    let appliedCount = 0;

    for (const file of sqlFiles) {
      const hash = file.replace(".sql", "");
      if (appliedHashes.has(hash)) {
        continue;
      }

      console.log(`Applying: ${file}...`);
      const sql = readFileSync(join(DRIZZLE_DIR, file), "utf-8");

      // Split by statement separator and execute each
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          await connection.execute(stmt);
        } catch (err) {
          // Skip "already exists" errors for idempotency
          if (err.code === "ER_TABLE_EXISTS_ERROR" || err.code === "ER_DUP_FIELDNAME") {
            console.log(`  Skipped (already exists): ${err.message.substring(0, 80)}`);
          } else {
            throw err;
          }
        }
      }

      // Record migration
      await connection.execute(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [hash, Date.now()]
      );
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log("Database is up to date. No new migrations to apply.");
    } else {
      console.log(`Successfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
