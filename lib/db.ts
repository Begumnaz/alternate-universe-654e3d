// ── SQLite database module ──
// Opens the DB at process.env.DATABASE_PATH (default /data/app.db on Railway).
// Runs CREATE TABLE IF NOT EXISTS idempotently on first import.

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

// Ensure the directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

// ── Schema (idempotent) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS character_sheets (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    base_personality TEXT NOT NULL,
    demographics_json TEXT NOT NULL,
    narrative_arc_json TEXT NOT NULL,
    social_web_json TEXT NOT NULL,
    additional_details_json TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS interview_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    life_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (life_id) REFERENCES character_sheets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS roleplay_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    life_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    scene_context TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (life_id) REFERENCES character_sheets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS simulation_logs (
    id TEXT PRIMARY KEY,
    life_id_a TEXT NOT NULL,
    life_id_b TEXT NOT NULL,
    story TEXT NOT NULL,
    scenario TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meeting_catalysts (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL,
    scenario TEXT NOT NULL,
    location TEXT NOT NULL,
    approach TEXT NOT NULL,
    dialogue_prompt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (life_id) REFERENCES character_sheets(id) ON DELETE CASCADE
  );
`);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

export default db;
