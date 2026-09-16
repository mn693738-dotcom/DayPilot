"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const DB_PATH = process.env.DATABASE_PATH || path_1.default.resolve(__dirname, "..", "server.db");
const SCHEMA_PATH = path_1.default.resolve(__dirname, "..", "db", "schema.sql");
async function initDb() {
    const db = await (0, sqlite_1.open)({ filename: DB_PATH, driver: sqlite3_1.default.Database });
    // Run schema if exists
    if (fs_1.default.existsSync(SCHEMA_PATH)) {
        const sql = fs_1.default.readFileSync(SCHEMA_PATH, "utf-8");
        await db.exec(sql);
    }
    return db;
}
