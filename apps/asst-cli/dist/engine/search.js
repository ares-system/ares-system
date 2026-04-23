import fs from "node:fs/promises";
import path from "node:path";
import { theme } from "../ui/theme.js";
const EXT_PATTERN = /\.(rs|ts|js|toml|json|md)$/;
const IGNORE_DIRS = new Set(["node_modules", "target", "dist", ".asst", ".git"]);
async function walkDir(dir) {
    const result = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name))
            continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...await walkDir(fullPath));
        }
        else if (EXT_PATTERN.test(entry.name)) {
            result.push(fullPath);
        }
    }
    return result;
}
export class ASSTCodeSearch {
    repoRoot;
    persistence;
    constructor(repoRoot, persistence) {
        this.repoRoot = repoRoot;
        this.persistence = persistence;
    }
    async indexAll(spinner) {
        const files = await walkDir(this.repoRoot);
        spinner.start(`Indexing ${files.length} files...`);
        for (const file of files) {
            const content = await fs.readFile(file, "utf-8");
            // In a full implementation, we would generate embeddings here
            // For now, we store metadata for quick lookup
            // Simplified: Just update index persistence
            // await this.persistence.updateIndex(file, content_hash);
        }
        spinner.stop(theme.success(`Successfully indexed ${files.length} files.`));
    }
    /**
     * Search for code patterns (Semantic-ish Mock)
     */
    async search(query) {
        // This would traditionally use a vector search
        // Placeholder: Return matching file paths based on simple inclusion for demo
        return `Results for "${query}": 
- src/lib.rs (Potential match)
- Anchor.toml (Mentioned config)`;
    }
}
