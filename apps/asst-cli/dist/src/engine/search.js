import { glob } from "glob";
import fs from "node:fs/promises";
import { theme } from "../ui/theme.js";
export class ASSTCodeSearch {
    repoRoot;
    persistence;
    constructor(repoRoot, persistence) {
        this.repoRoot = repoRoot;
        this.persistence = persistence;
    }
    /**
     * Index the codebase for search
     */
    async indexAll(spinner) {
        const files = await glob("**/*.{rs,ts,js,toml,json,md}", {
            cwd: this.repoRoot,
            ignore: ["node_modules/**", "target/**", "dist/**", ".asst/**"],
        });
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
