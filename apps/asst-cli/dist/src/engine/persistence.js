import sqlite3 from "sqlite3";
import { promisify } from "node:util";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
export class ASSTPersistence {
    db;
    runQuery;
    constructor(repoRoot) {
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
        await this.runQuery(`
      CREATE TABLE IF NOT EXISTS code_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE,
        content_hash TEXT,
        last_indexed DATETIME
      )
    `);
    }
    async addHistory(role, content) {
        await this.runQuery("INSERT INTO chat_history (role, content) VALUES (?, ?)", [role, content]);
    }
    async getHistory(limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT role, content FROM chat_history ORDER BY timestamp DESC LIMIT ?", [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async close() {
        return new Promise((resolve) => this.db.close(() => resolve(true)));
    }
}
