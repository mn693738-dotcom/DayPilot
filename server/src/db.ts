import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const DB_PATH = process.env.DATABASE_PATH || path.resolve(__dirname, "..", "server.db");
const SCHEMA_PATH = path.resolve(__dirname, "..", "db", "schema.sql");

export async function initDb() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  // Run schema if exists
  if (fs.existsSync(SCHEMA_PATH)) {
    const sql = fs.readFileSync(SCHEMA_PATH, "utf-8");
    await db.exec(sql);
  }

  const userColumns = await db.all<{ name: string }[]>("PRAGMA table_info(users)");
  const existingColumns = new Set(userColumns.map((column) => column.name));
  if (!existingColumns.has("username")) await db.exec("ALTER TABLE users ADD COLUMN username TEXT");
  if (!existingColumns.has("session_type")) await db.exec("ALTER TABLE users ADD COLUMN session_type TEXT NOT NULL DEFAULT 'temporary'");
  if (!existingColumns.has("last_active_at")) await db.exec("ALTER TABLE users ADD COLUMN last_active_at DATETIME");
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");

  return db;
}

export type DB = Awaited<ReturnType<typeof initDb>>;
