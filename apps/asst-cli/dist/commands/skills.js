import { theme } from "../ui/theme.js";
import { renderBanner } from "../ui/components/Banner.js";
import { renderPanel, renderDivider } from "../ui/components/Panel.js";
import { listInstalledSkills } from "@ares/engine";
import chalk from "chalk";
export async function skillsCommand(options) {
    const repoRoot = process.cwd();
    const skills = listInstalledSkills(repoRoot);
    const c = theme.c;
    if (options.info) {
        // ─── Skill Detail View ─────────────────────────────────
        const skill = skills.find((s) => s.name === options.info);
        if (!skill) {
            console.log(renderPanel(chalk.hex(c.red)(`Skill "${options.info}" not found.\n`) +
                chalk.hex(c.textDim)("Run 'asst skills' to see all installed skills."), { title: "Not Found", borderColor: c.red, padding: 1 }));
            return;
        }
        const preview = skill.content.split("\n").slice(0, 40).join("\n");
        const totalLines = skill.content.split("\n").length;
        console.log("");
        console.log(renderPanel(chalk.hex(c.text)(preview) +
            (totalLines > 40 ? `\n\n${chalk.hex(c.textDim)(`... ${totalLines - 40} more lines`)}` : ""), { title: skill.name, borderColor: c.cyan, padding: 1 }));
        console.log(chalk.hex(c.textDim)(`  Path: ${skill.path}`));
        console.log("");
        return;
    }
    // ─── List All Skills ──────────────────────────────────────
    console.log("");
    console.log(renderBanner({
        compact: true,
        subtitle: "Installed Security Skills",
        version: "2.0.0",
        items: [
            { label: "Total", value: `${skills.length} skills loaded` },
            { label: "Source", value: repoRoot },
        ],
    }));
    console.log("");
    if (skills.length === 0) {
        console.log(renderPanel(chalk.hex(c.yellow)("No skills installed.\n\n") +
            chalk.hex(c.text)("Install with:\n") +
            chalk.hex(c.cyan)("  npx skills add agentic-reserve/blockint-skills --yes"), { title: "Skills", borderColor: c.yellow, padding: 1 }));
        return;
    }
    // Categorize skills
    const categories = {
        "Solana Security": { icon: "🔴", color: c.red, skills: [] },
        "DeFi & Investigation": { icon: "🟡", color: c.yellow, skills: [] },
        "Compliance & Reference": { icon: "🔵", color: c.blue, skills: [] },
        "Tools & Specs": { icon: "⚪", color: c.textDim, skills: [] },
    };
    for (const s of skills) {
        const n = s.name;
        if (n.includes("solana") || n.includes("sealevel") || n.includes("neodyme") || n.includes("osec")) {
            categories["Solana Security"].skills.push(n);
        }
        else if (n.includes("defi") || n.includes("rug") || n.includes("mev") || n.includes("flash") ||
            n.includes("honeypot") || n.includes("sandwich") || n.includes("investigat") || n.includes("audit")) {
            categories["DeFi & Investigation"].skills.push(n);
        }
        else if (n.includes("compliance") || n.includes("fatf") || n.includes("screening") ||
            n.includes("chainalysis") || n.includes("risk") || n.includes("phalcon")) {
            categories["Compliance & Reference"].skills.push(n);
        }
        else {
            categories["Tools & Specs"].skills.push(n);
        }
    }
    // Render each category as a panel
    for (const [catName, cat] of Object.entries(categories)) {
        if (cat.skills.length === 0)
            continue;
        const content = cat.skills.map(name => {
            return `  ${chalk.hex(c.cyan)("•")}  ${chalk.hex(c.text)(name)}`;
        }).join("\n");
        console.log(renderPanel(content, {
            title: `${cat.icon} ${catName} (${cat.skills.length})`,
            borderColor: cat.color,
            padding: 0,
        }));
        console.log("");
    }
    console.log(renderDivider({ label: `${skills.length} skills ready` }));
    console.log("");
}
