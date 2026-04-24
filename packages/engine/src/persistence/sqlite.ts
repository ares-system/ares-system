import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import Database from "better-sqlite3";

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

interface IndexRecord {
  path: string;
  content_hash: string;
  last_indexed: string;
}

export class ASSTPersistenceSQLite {
  private db!: Database.Database;
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async init() {
    const asstDir = join(this.repoRoot, ".asst");
    if (!existsSync(asstDir)) {
      mkdirSync(asstDir, { recursive: true });
    }

    const dbPath = join(asstDir, "asst.db");
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrent performance
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS code_index (
        path TEXT PRIMARY KEY,
        content_hash TEXT NOT NULL,
        last_indexed TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS scan_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent TEXT NOT NULL,
        output TEXT NOT NULL,
        repo TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS watch_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        alerts INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS targets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        riskScore INTEGER DEFAULT 0,
        owner TEXT,
        lastSeen TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        aiQuotaUsage INTEGER DEFAULT 0,
        aiQuotaMax INTEGER DEFAULT 1000,
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_scan_timestamp ON scan_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_watch_timestamp ON watch_events(timestamp);
    `);

    // Migrate from lowdb JSON if it exists
    await this.migrateFromLowdb();
  }

  private async migrateFromLowdb() {
    const jsonPath = join(this.repoRoot, ".asst", "asst.json");
    if (!existsSync(jsonPath)) return;

    try {
      const data = JSON.parse(readFileSync(jsonPath, "utf8"));

      // Check if already migrated
      const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM chat_history");
      const { count } = countStmt.get() as { count: number };
      if (count > 0) return; // Already has data, skip

      // Migrate chat history
      const insertChat = this.db.prepare(
        "INSERT INTO chat_history (role, content, timestamp) VALUES (?, ?, ?)"
      );
      const migrateChats = this.db.transaction((messages: ChatMessage[]) => {
        for (const msg of messages) {
          insertChat.run(msg.role, msg.content, msg.timestamp);
        }
      });

      if (data.chat_history?.length > 0) {
        migrateChats(data.chat_history);
      }

      // Migrate code index
      const insertIndex = this.db.prepare(
        "INSERT OR REPLACE INTO code_index (path, content_hash, last_indexed) VALUES (?, ?, ?)"
      );
      const migrateIndex = this.db.transaction((records: IndexRecord[]) => {
        for (const rec of records) {
          insertIndex.run(rec.path, rec.content_hash, rec.last_indexed);
        }
      });

      if (data.code_index?.length > 0) {
        migrateIndex(data.code_index);
      }

      console.log(`[persistence] Migrated ${data.chat_history?.length || 0} chat messages and ${data.code_index?.length || 0} index records from lowdb.`);
    } catch {
      // Migration is best-effort
    }
  }

  // ─── Chat History ───────────────────────────────────────────────

  async addHistory(role: string, content: string) {
    const stmt = this.db.prepare(
      "INSERT INTO chat_history (role, content, timestamp) VALUES (?, ?, ?)"
    );
    stmt.run(role, content, new Date().toISOString());
  }

  async getHistory(limit = 50): Promise<ChatMessage[]> {
    const stmt = this.db.prepare(
      "SELECT role, content, timestamp FROM chat_history ORDER BY id DESC LIMIT ?"
    );
    return stmt.all(limit) as ChatMessage[];
  }

  // ─── Code Index ─────────────────────────────────────────────────

  async upsertCodeIndex(path: string, hash: string) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO code_index (path, content_hash, last_indexed) VALUES (?, ?, ?)"
    );
    stmt.run(path, hash, new Date().toISOString());
  }

  async searchCodeIndex(term: string): Promise<IndexRecord[]> {
    const stmt = this.db.prepare(
      "SELECT path, content_hash, last_indexed FROM code_index WHERE path LIKE ? LIMIT 20"
    );
    return stmt.all(`%${term}%`) as IndexRecord[];
  }

  // ─── Scan Results ───────────────────────────────────────────────

  async addScanResult(agent: string, output: string, repo: string) {
    const stmt = this.db.prepare(
      "INSERT INTO scan_results (agent, output, repo, timestamp) VALUES (?, ?, ?, ?)"
    );
    stmt.run(agent, output, repo, new Date().toISOString());
  }

  async getLatestScanResults(repo: string, limit = 10) {
    const stmt = this.db.prepare(
      "SELECT agent, output, timestamp FROM scan_results WHERE repo = ? ORDER BY id DESC LIMIT ?"
    );
    return stmt.all(repo, limit);
  }

  // ─── Watch Events ───────────────────────────────────────────────

  async addWatchEvent(eventType: string, filePath: string, alerts: number) {
    const stmt = this.db.prepare(
      "INSERT INTO watch_events (event_type, file_path, alerts, timestamp) VALUES (?, ?, ?, ?)"
    );
    stmt.run(eventType, filePath, alerts, new Date().toISOString());
  }

  async getWatchStats(since?: string) {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalEvents,
        SUM(alerts) as totalAlerts,
        COUNT(DISTINCT file_path) as uniqueFiles
      FROM watch_events 
      WHERE timestamp > ?
    `);
    return stmt.get(sinceDate);
  }

  // ─── Targets ────────────────────────────────────────────────────

  async addTarget(target: any) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO targets (id, name, type, status, riskScore, owner, lastSeen) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(target.id, target.name, target.type, target.status, target.riskScore || 0, target.owner, new Date().toISOString());
  }

  async getTargets() {
    const stmt = this.db.prepare("SELECT * FROM targets ORDER BY lastSeen DESC");
    return stmt.all();
  }

  // ─── Profiles ───────────────────────────────────────────────────

  async getProfile(id: string) {
    const stmt = this.db.prepare("SELECT * FROM profiles WHERE id = ?");
    let profile = stmt.get(id);
    if (!profile && id === 'alice') {
      // Seed default profile
      this.db.prepare("INSERT INTO profiles (id, name, role, aiQuotaUsage, aiQuotaMax) VALUES (?, ?, ?, ?, ?)").run('alice', 'Alice Operator', 'Security Lead', 142, 1000);
      profile = stmt.get(id);
    }
    return profile;
  }

  async updateProfileUsage(id: string, increment: number) {
    this.db.prepare("UPDATE profiles SET aiQuotaUsage = aiQuotaUsage + ?, updatedAt = ? WHERE id = ?").run(increment, new Date().toISOString(), id);
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  async close() {
    this.db.close();
    return true;
  }
}
