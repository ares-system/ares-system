import chalk from "chalk";
import { theme, box } from "../theme.js";
const LOGO = `
 █████╗ ██████╗ ███████╗███████╗
██╔══██╗██╔══██╗██╔════╝██╔════╝
███████║██████╔╝█████╗  ███████╗
██╔══██║██╔══██╗██╔══╝  ╚════██║
██║  ██║██║  ██║███████╗███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝`;
const LOGO_SMALL = `
 ╔═╗ ╦═╗ ╔═╗ ╔═╗
 ╠═╣ ╠╦╝ ║╣  ╚═╗
 ╩ ╩ ╩╚═ ╚═╝ ╚═╝`;
export function renderBanner(opts = {}) {
    const width = Math.min(process.stdout.columns || 80, 72);
    const c = theme.c;
    const lines = [];
    // Top border
    lines.push(chalk.hex(c.border)(box.tl + box.h.repeat(width - 2) + box.tr));
    if (opts.compact) {
        // Small logo mode
        const logoLines = LOGO_SMALL.trim().split("\n");
        for (const line of logoLines) {
            const content = chalk.hex(c.cyan).bold(line);
            const padded = content + " ".repeat(Math.max(0, width - 2 - line.length));
            lines.push(chalk.hex(c.border)(box.v) + padded + chalk.hex(c.border)(box.v));
        }
    }
    else {
        // Full logo
        const logoLines = LOGO.trim().split("\n");
        for (const line of logoLines) {
            const content = chalk.hex(c.cyan).bold(line);
            const pad = Math.max(0, width - 2 - line.length);
            lines.push(chalk.hex(c.border)(box.v) + content + " ".repeat(pad) + chalk.hex(c.border)(box.v));
        }
    }
    // Subtitle line
    const subtitleText = opts.subtitle || "Automated Resilience Evaluation System";
    const subtitleLine = chalk.hex(c.textDim)("  " + subtitleText);
    const subPad = Math.max(0, width - 2 - subtitleText.length - 2);
    lines.push(chalk.hex(c.border)(box.v) + subtitleLine + " ".repeat(subPad) + chalk.hex(c.border)(box.v));
    // Version
    if (opts.version) {
        const verText = `  v${opts.version}`;
        const verPad = Math.max(0, width - 2 - verText.length);
        lines.push(chalk.hex(c.border)(box.v) + chalk.hex(c.textDim)(verText) + " ".repeat(verPad) + chalk.hex(c.border)(box.v));
    }
    // Separator
    lines.push(chalk.hex(c.border)(box.l + box.h.repeat(width - 2) + box.r));
    // Info items
    const allItems = opts.items || [];
    if (opts.repo)
        allItems.unshift({ label: "Target", value: opts.repo });
    if (opts.model)
        allItems.push({ label: "Model", value: opts.model });
    for (const item of allItems) {
        const label = chalk.hex(c.textDim)(`  ${item.label}`);
        const value = chalk.hex(c.white)(item.value);
        const content = `  ${item.label}  ${item.value}`;
        const itemPad = Math.max(0, width - 2 - content.length);
        lines.push(chalk.hex(c.border)(box.v) +
            label + "  " + value +
            " ".repeat(itemPad) +
            chalk.hex(c.border)(box.v));
    }
    // Bottom border
    lines.push(chalk.hex(c.border)(box.bl + box.h.repeat(width - 2) + box.br));
    return lines.join("\n");
}
