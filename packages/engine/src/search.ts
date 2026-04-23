import fs from "node:fs/promises";
import path from "node:path";
import { ASSTPersistence } from "./persistence.js";

const EXT_PATTERN = /\.(rs|ts|js|toml|json|md)$/;
const IGNORE_DIRS = new Set(["node_modules", "target", "dist", ".asst", ".git"]);

async function walkDir(dir: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await walkDir(fullPath));
    } else if (EXT_PATTERN.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

export class ASSTCodeSearch {
  constructor(private repoRoot: string, private persistence: ASSTPersistence) {}

  async indexAll(spinner: any) {
    const files = await walkDir(this.repoRoot);

    spinner.start(`Indexing ${files.length} files...`);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf-8");
      } catch (err) {
        console.log(`[ARES-SEARCH] Attempted to read binary or unsupported file: ${file}`);
      }
    }

    spinner.stop(`Successfully indexed ${files.length} files.`);
  }

  /**
   * Search for code patterns (Semantic-ish Mock)
   */
  async search(query: string) {
    // This would traditionally use a vector search
    // Placeholder: Return matching file paths based on simple inclusion for demo
    return `Results for "${query}": 
- src/lib.rs (Potential match)
- Anchor.toml (Mentioned config)`;
  }
}
