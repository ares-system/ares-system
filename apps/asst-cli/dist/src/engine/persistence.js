import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
// lowdb is ESM-only, but esbuild will bundle it correctly for our CJS target
import { JSONFilePreset } from 'lowdb/node';
export class ASSTPersistence {
    db;
    repoRoot;
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }
    async init() {
        const asstDir = join(this.repoRoot, ".asst");
        if (!existsSync(asstDir)) {
            mkdirSync(asstDir, { recursive: true });
        }
        const dbPath = join(asstDir, "asst.json");
        // Initialize lowdb with default data
        this.db = await JSONFilePreset(dbPath, {
            chat_history: [],
            code_index: []
        });
    }
    async upsertCodeIndex(path, hash) {
        const index = this.db.data.code_index.findIndex((r) => r.path === path);
        const record = {
            path,
            content_hash: hash,
            last_indexed: new Date().toISOString()
        };
        if (index > -1) {
            this.db.data.code_index[index] = record;
        }
        else {
            this.db.data.code_index.push(record);
        }
        await this.db.write();
    }
    async searchCodeIndex(term) {
        return this.db.data.code_index
            .filter((r) => r.path.includes(term) || r.content_hash.includes(term))
            .slice(0, 20);
    }
    async addHistory(role, content) {
        this.db.data.chat_history.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });
        await this.db.write();
    }
    async getHistory(limit = 50) {
        // Return latest entries first
        return [...this.db.data.chat_history]
            .reverse()
            .slice(0, limit);
    }
    async close() {
        // lowdb is auto-closed as it's just a file writer
        return true;
    }
}
