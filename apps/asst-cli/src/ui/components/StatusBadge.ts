import chalk from "chalk";
import { theme } from "../theme.js";

// ─── Status Badges ─────────────────────────────────────────

export type BadgeType = "pass" | "fail" | "warn" | "info" | "running" | "done" | "skip" | "critical";

const badgeConfig: Record<BadgeType, { bg: string; fg: string; icon: string; label: string }> = {
  pass:     { bg: "#16A34A", fg: "#FFFFFF", icon: "✓", label: "PASSED" },
  fail:     { bg: "#EF4444", fg: "#FFFFFF", icon: "✗", label: "FAILED" },
  warn:     { bg: "#D97706", fg: "#FFFFFF", icon: "⚠", label: "WARNING" },
  info:     { bg: "#2563EB", fg: "#FFFFFF", icon: "◉", label: "INFO" },
  running:  { bg: "#7C3AED", fg: "#FFFFFF", icon: "◎", label: "RUNNING" },
  done:     { bg: "#16A34A", fg: "#FFFFFF", icon: "✓", label: "DONE" },
  skip:     { bg: "#475569", fg: "#FFFFFF", icon: "○", label: "SKIPPED" },
  critical: { bg: "#DC2626", fg: "#FFFFFF", icon: "✗", label: "CRITICAL" },
};

export function renderBadge(type: BadgeType, customLabel?: string): string {
  const cfg = badgeConfig[type];
  const label = customLabel || cfg.label;
  return chalk.bgHex(cfg.bg).hex(cfg.fg).bold(` ${cfg.icon} ${label} `);
}

// ─── Inline Status ─────────────────────────────────────────

export function statusIcon(type: "pass" | "fail" | "warn" | "running" | "pending"): string {
  switch (type) {
    case "pass":    return chalk.hex("#4ADE80")("✓");
    case "fail":    return chalk.hex("#F87171")("✗");
    case "warn":    return chalk.hex("#FBBF24")("⚠");
    case "running": return chalk.hex("#A78BFA")("◎");
    case "pending": return chalk.hex("#64748B")("○");
  }
}

// ─── Agent Lane ────────────────────────────────────────────

interface AgentLaneOptions {
  name: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  time?: string;
  width?: number;
}

export function renderAgentLane(opts: AgentLaneOptions): string {
  const width = opts.width || Math.min(process.stdout.columns || 80, 72);
  const c = theme.c;

  let icon: string;
  let nameStyled: string;
  let statusStyled: string;

  switch (opts.status) {
    case "pending":
      icon = chalk.hex(c.textDim)("○");
      nameStyled = chalk.hex(c.textDim)(opts.label);
      statusStyled = chalk.hex(c.textDim)("waiting");
      break;
    case "running":
      icon = chalk.hex(c.purple)("◎");
      nameStyled = chalk.hex(c.white).bold(opts.label);
      statusStyled = renderBadge("running");
      break;
    case "done":
      icon = chalk.hex(c.green)("✓");
      nameStyled = chalk.hex(c.text)(opts.label);
      statusStyled = renderBadge("pass", "COMPLETE");
      break;
    case "error":
      icon = chalk.hex(c.red)("✗");
      nameStyled = chalk.hex(c.red)(opts.label);
      statusStyled = renderBadge("fail");
      break;
  }

  const timeStr = opts.time ? chalk.hex(c.textDim)(` ${opts.time}`) : "";
  const left = `  ${icon}  ${nameStyled}`;

  return `${left}  ${statusStyled}${timeStr}`;
}

// ─── Progress Bar ──────────────────────────────────────────

export function renderProgressBar(current: number, total: number, width = 30): string {
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const percent = Math.round(ratio * 100);

  const bar = chalk.hex(theme.c.green)("█".repeat(filled)) + 
              chalk.hex(theme.c.borderDim)("░".repeat(empty));

  const label = percent === 100 
    ? chalk.hex(theme.c.green).bold(`${percent}%`)
    : chalk.hex(theme.c.text)(`${percent}%`);

  return `  ${bar}  ${label}  ${chalk.hex(theme.c.textDim)(`${current}/${total}`)}`;
}
