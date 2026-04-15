import sqlite3 from "sqlite3";
import { promisify } from "node:util";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

export class ASSTPersistence {
  private db: sqlite3.Database;
  private runQuery: any;

  constructor(repoRoot: string) {
    const asstDir = join(repoRoot, ".asst");
    if (!existsSync(asstDir)) {
      mkdirSync(asstDir, { recursive: true });
    }

    const dbPath = join(asstDir, "asst.db");
    this.db = new sqlite3.Database(dbPath);
    this.runQuery = promisify(this.db.run.bind(this.db));
  }

  async init() {
    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        role TEXT,
        content TEXT
      )
    `);

  async upsertCodeIndex(path: string, hash: string) {
    await this.runQuery(
      "INSERT INTO code_index (path, content_hash, last_indexed) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(path) DO UPDATE SET content_hash=excluded.content_hash, last_indexed=excluded.last_indexed",
      [path, hash]
    );
  }

  async searchCodeIndex(term: string) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT path FROM code_index WHERE path LIKE ? OR content_hash LIKE ? LIMIT 20",
        [`%${term}%`, `%${term}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async addHistory(role: string, content: string) {
    await this.runQuery(
      "INSERT INTO chat_history (role, content) VALUES (?, ?)",
      [role, content]
    );
  }

  async getHistory(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT role, content FROM chat_history ORDER BY timestamp DESC LIMIT ?",
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async close() {
    return new Promise((resolve) => this.db.close(() => resolve(true)));
  }
}
