import chalk from "chalk";
import { theme, box } from "../theme.js";
export function renderTable(opts) {
    const c = theme.c;
    const bc = chalk.hex(opts.borderColor || c.border);
    const maxWidth = opts.maxWidth || Math.min(process.stdout.columns || 80, 72);
    const stripe = opts.stripe ?? true;
    // Calculate column widths
    const colWidths = opts.columns.map((col, i) => {
        if (col.width)
            return col.width;
        // Auto-size: max of header and all row values
        let max = col.label.length;
        for (const row of opts.rows) {
            if (row[i])
                max = Math.max(max, row[i].length);
        }
        return Math.min(max + 2, 40);
    });
    // Ensure total fits
    const totalInner = colWidths.reduce((s, w) => s + w, 0) + colWidths.length + 1;
    const scale = totalInner > maxWidth ? maxWidth / totalInner : 1;
    const finalWidths = colWidths.map(w => Math.max(4, Math.floor(w * scale)));
    const lines = [];
    // Helper: render a horizontal rule
    const hRule = (left, mid, right, h) => {
        return bc(left + finalWidths.map(w => h.repeat(w)).join(bc(mid)) + right);
    };
    // Top border with optional title
    if (opts.title) {
        const titleText = ` ${opts.title} `;
        const titleStyled = chalk.hex(c.cyan).bold(titleText);
        const totalWidth = finalWidths.reduce((s, w) => s + w, 0) + finalWidths.length + 1;
        const remaining = totalWidth - titleText.length - 2;
        lines.push(bc(box.tl + box.h) + titleStyled + bc(box.h.repeat(Math.max(0, remaining)) + box.tr));
    }
    else {
        lines.push(hRule(box.tl, box.t, box.tr, box.h));
    }
    // Header row
    const headerCells = opts.columns.map((col, i) => {
        const text = col.label.padEnd(finalWidths[i]).substring(0, finalWidths[i]);
        return chalk.hex(c.cyan).bold(text);
    });
    lines.push(bc(box.v) + headerCells.join(bc(box.v)) + bc(box.v));
    // Header separator
    lines.push(hRule(box.l, box.x, box.r, box.h));
    // Data rows
    for (let ri = 0; ri < opts.rows.length; ri++) {
        const row = opts.rows[ri];
        const isStripe = stripe && ri % 2 === 1;
        const cells = opts.columns.map((col, ci) => {
            const raw = row[ci] || "";
            const text = raw.substring(0, finalWidths[ci]).padEnd(finalWidths[ci]);
            const color = col.color || (isStripe ? c.text : c.text);
            return chalk.hex(color)(text);
        });
        const rowStr = bc(box.v) + cells.join(bc(box.v)) + bc(box.v);
        lines.push(isStripe ? chalk.bgHex(c.bgLight)(rowStr) : rowStr);
    }
    // Bottom border
    lines.push(hRule(box.bl, box.b, box.br, box.h));
    return lines.join("\n");
}
/** Simple key-value list in a bordered box */
export function renderKeyValue(title, items) {
    const c = theme.c;
    const maxKey = Math.max(...items.map(i => i.key.length));
    const contentLines = items.map(item => {
        const key = chalk.hex(c.textDim)(item.key.padEnd(maxKey + 2));
        const val = chalk.hex(item.valueColor || c.white)(item.value);
        return `${key}${val}`;
    }).join("\n");
    return contentLines;
}
