import { intro, outro } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { listInstalledSkills } from "../engine/skill-loader.js";
export async function skillsCommand(options) {
    const repoRoot = process.cwd();
    const skills = listInstalledSkills(repoRoot);
    if (options.info) {
        // Show details for a specific skill
        const skill = skills.find(s => s.name === options.info);
        if (!skill) {
            console.log(theme.error(`Skill "${options.info}" not found.`));
            console.log(theme.info("Run 'asst skills' to see all installed skills."));
            return;
        }
        console.log(theme.accent(`\n─── ${skill.name} ───\n`));
        // Show first 40 lines of the skill content
        const preview = skill.content.split("\n").slice(0, 40).join("\n");
        console.log(preview);
        if (skill.content.split("\n").length > 40) {
            console.log(theme.info(`\n... (${skill.content.split("\n").length - 40} more lines)`));
            console.log(theme.info(`Full path: ${skill.path}`));
        }
        return;
    }
    // List all skills
    intro(theme.accent(" ASST INSTALLED SKILLS "));
    if (skills.length === 0) {
        console.log(theme.warning("No skills installed."));
        console.log(theme.info("Run: npx skills add agentic-reserve/blockint-skills --yes"));
        outro("");
        return;
    }
    console.log(theme.info(`Found ${skills.length} skills in this repository:\n`));
    // Categorize for display
    const categories = {
        "🔴 Solana Security": [],
        "🟡 DeFi & Investigation": [],
        "🔵 Compliance & Reference": [],
        "⚪ Tools & Specs": []
    };
    for (const s of skills) {
        const n = s.name;
        if (n.includes("solana") || n.includes("sealevel") || n.includes("neodyme") || n.includes("osec")) {
            categories["🔴 Solana Security"].push(n);
        }
        else if (n.includes("defi") || n.includes("rug") || n.includes("mev") || n.includes("flash") ||
            n.includes("honeypot") || n.includes("sandwich") || n.includes("investigat") || n.includes("audit")) {
            categories["🟡 DeFi & Investigation"].push(n);
        }
        else if (n.includes("compliance") || n.includes("fatf") || n.includes("screening") ||
            n.includes("chainalysis") || n.includes("risk") || n.includes("phalcon")) {
            categories["🔵 Compliance & Reference"].push(n);
        }
        else {
            categories["⚪ Tools & Specs"].push(n);
        }
    }
    for (const [category, names] of Object.entries(categories)) {
        if (names.length === 0)
            continue;
        console.log(`${category} (${names.length})`);
        for (const name of names) {
            console.log(`  ${theme.repo("•")} ${name}`);
        }
        console.log("");
    }
    outro(theme.brand(` ${skills.length} skills ready `));
}
