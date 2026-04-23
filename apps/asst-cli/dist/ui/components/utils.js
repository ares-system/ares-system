// ─── String Utilities ──────────────────────────────────────
/** Strip ANSI codes for measuring visible width */
function stripAnsi(str) {
    return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}
/** Visible character width */
function visibleLength(str) {
    return stripAnsi(str).length;
}
/** Pad string to target visible width */
function padEnd(str, width, char = " ") {
    const diff = width - visibleLength(str);
    return diff > 0 ? str + char.repeat(diff) : str;
}
function padStart(str, width, char = " ") {
    const diff = width - visibleLength(str);
    return diff > 0 ? char.repeat(diff) + str : str;
}
function center(str, width, char = " ") {
    const diff = width - visibleLength(str);
    if (diff <= 0)
        return str;
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return char.repeat(left) + str + char.repeat(right);
}
/** Get terminal width safely */
function termWidth() {
    return process.stdout.columns || 80;
}
// ─── Exports ───────────────────────────────────────────────
export { stripAnsi, visibleLength, padEnd, padStart, center, termWidth };
