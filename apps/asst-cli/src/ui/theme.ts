import chalk from "chalk";

/**
 * ASST Terminal Theme — Dark Eclipse
 * 
 * Inspired by Ratatui, Claude Code, Daytona, and Specify CLI.
 * Dark backgrounds, cyan/green accents, clean bordered panels.
 */

// ─── Color Tokens ──────────────────────────────────────────

const colors = {
  // Primary accents
  cyan:       "#00D4AA",
  cyanDim:    "#0A8F7A",
  green:      "#4ADE80",
  greenDim:   "#16A34A",
  
  // Status colors
  red:        "#F87171",
  redBright:  "#EF4444",
  yellow:     "#FBBF24",
  orange:     "#FB923C",
  blue:       "#60A5FA",
  purple:     "#A78BFA",
  
  // Neutrals
  white:      "#F8FAFC",
  text:       "#CBD5E1",
  textDim:    "#64748B",
  border:     "#334155",
  borderDim:  "#1E293B",
  bg:         "#0F172A",
  bgLight:    "#1E293B",
  
  // Brand
  brand:      "#00D4AA",
  brandDim:   "#0A8F7A",
};

// ─── Semantic Styles ───────────────────────────────────────

export const theme = {
  // Text styles
  brand:    chalk.hex(colors.brand).bold,
  accent:   chalk.hex(colors.cyan),
  dim:      chalk.hex(colors.textDim),
  text:     chalk.hex(colors.text),
  white:    chalk.hex(colors.white).bold,
  muted:    chalk.hex(colors.textDim).italic,

  // Status  
  error:    chalk.hex(colors.red).bold,
  success:  chalk.hex(colors.green).bold,
  warning:  chalk.hex(colors.yellow).bold,
  info:     chalk.hex(colors.blue),
  
  // Special
  header:   (t: string) => chalk.hex(colors.brand).bold(t),
  repo:     (t: string) => chalk.hex(colors.cyan).italic(t),
  label:    (t: string) => chalk.hex(colors.textDim)(t),
  value:    (t: string) => chalk.hex(colors.white)(t),
  
  // Badge-style labels
  badge: {
    pass:    chalk.bgHex("#16A34A").hex("#FFFFFF").bold(" ✓ PASSED "),
    fail:    chalk.bgHex("#EF4444").hex("#FFFFFF").bold(" ✗ FAILED "),
    warn:    chalk.bgHex("#D97706").hex("#FFFFFF").bold(" ⚠ WARNING "),
    info:    chalk.bgHex("#2563EB").hex("#FFFFFF").bold(" ◉ INFO "),
    running: chalk.bgHex("#7C3AED").hex("#FFFFFF").bold(" ◎ RUNNING "),
    done:    chalk.bgHex("#16A34A").hex("#FFFFFF").bold(" ✓ DONE "),
    skip:    chalk.bgHex("#475569").hex("#FFFFFF").bold(" ○ SKIPPED "),
  },

  // Colors for direct use
  c: colors,
};

// ─── Box Drawing Characters ────────────────────────────────

export const box = {
  tl: "╭", tr: "╮", bl: "╰", br: "╯",
  h: "─", v: "│",
  // Double line
  dtl: "╔", dtr: "╗", dbl: "╚", dbr: "╝",
  dh: "═", dv: "║",
  // Connectors
  t: "┬", b: "┴", l: "├", r: "┤", x: "┼",
};
