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

  return db;
}

export type DB = Awaited<ReturnType<typeof initDb>>;
