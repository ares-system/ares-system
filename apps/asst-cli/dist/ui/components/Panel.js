import chalk from "chalk";
import { theme, box } from "../theme.js";
import { visibleLength } from "./utils.js";
export function renderPanel(content, opts = {}) {
    const c = theme.c;
    const width = opts.width || Math.min(process.stdout.columns || 80, 72);
    const innerWidth = width - 2;
    const borderColor = opts.borderColor || c.border;
    const padding = opts.padding ?? 1;
    const bc = chalk.hex(borderColor);
    const chars = opts.style === "double"
        ? { tl: box.dtl, tr: box.dtr, bl: box.dbl, br: box.dbr, h: box.dh, v: box.dv }
        : { tl: box.tl, tr: box.tr, bl: box.bl, br: box.br, h: box.h, v: box.v };
    const lines = [];
    // Top border with title
    if (opts.title) {
        const titleText = ` ${opts.title} `;
        const titleStyled = chalk.hex(c.cyan).bold(titleText);
        const titleLen = titleText.length;
        const remaining = innerWidth - titleLen;
        if (opts.titleAlign === "center") {
            const left = Math.floor(remaining / 2);
            const right = remaining - left;
            lines.push(bc(chars.tl + chars.h.repeat(left) + titleStyled + bc(chars.h.repeat(right) + chars.tr)));
        }
        else if (opts.titleAlign === "right") {
            lines.push(bc(chars.tl + chars.h.repeat(remaining - 1) + titleStyled + bc(chars.h + chars.tr)));
        }
        else {
            lines.push(bc(chars.tl + chars.h + titleStyled + bc(chars.h.repeat(remaining - 1) + chars.tr)));
        }
    }
    else {
        lines.push(bc(chars.tl + chars.h.repeat(innerWidth) + chars.tr));
    }
    // Padding top
    for (let i = 0; i < padding; i++) {
        lines.push(bc(chars.v) + " ".repeat(innerWidth) + bc(chars.v));
    }
    // Content lines
    const contentLines = content.split("\n");
    for (const line of contentLines) {
        const stripped = line;
        const vis = visibleLength(stripped);
        const availableWidth = innerWidth - 2; // 1 char padding each side
        const padAmount = Math.max(0, availableWidth - vis);
        lines.push(bc(chars.v) + " " + stripped + " ".repeat(padAmount) + " " + bc(chars.v));
    }
    // Padding bottom
    for (let i = 0; i < padding; i++) {
        lines.push(bc(chars.v) + " ".repeat(innerWidth) + bc(chars.v));
    }
    // Bottom border
    lines.push(bc(chars.bl + chars.h.repeat(innerWidth) + chars.br));
    return lines.join("\n");
}
/** Simple horizontal divider */
export function renderDivider(opts = {}) {
    const width = opts.width || Math.min(process.stdout.columns || 80, 72);
    const c = opts.color || theme.c.border;
    const bc = chalk.hex(c);
    if (opts.label) {
        const labelText = ` ${opts.label} `;
        const labelStyled = chalk.hex(theme.c.textDim)(labelText);
        const remaining = width - labelText.length;
        const left = Math.floor(remaining / 2);
        const right = remaining - left;
        return bc(box.h.repeat(left)) + labelStyled + bc(box.h.repeat(right));
    }
    return bc(box.h.repeat(width));
}
/** Key-value info row inside a panel */
export function renderInfoRow(label, value, labelWidth = 14) {
    const styledLabel = chalk.hex(theme.c.textDim)(label.padEnd(labelWidth));
    const styledValue = chalk.hex(theme.c.white)(value);
    return `${styledLabel} ${styledValue}`;
}
