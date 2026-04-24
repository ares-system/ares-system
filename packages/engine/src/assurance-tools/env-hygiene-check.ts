import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import {
  makeFinding,
  makeToolResult,
  stringifyToolResult,
  toHumanSummary,
  type Finding,
} from "../findings/index.js";

// ─── Rule catalog ───────────────────────────────────────────────────

const TOOL_NAME = "env_hygiene_check";

interface EnvCheck {
  ruleId: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "high" | "medium" | "low";
  description: string;
  rationale: string;
  remediation: string;
  file: string;
  evaluate: (cwd: string) => boolean; // returns true when the rule PASSES (no finding)
}

const ENV_CHECKS: EnvCheck[] = [
  {
    ruleId: "env-hygiene.missing-env-example",
    title: "Missing .env.example at repo root",
    severity: "low",
    confidence: "high",
    description:
      "Project does not ship a .env.example, making onboarding and secret-configuration error-prone.",
    rationale:
      "Teams rely on .env.example to know which variables the app consumes; its absence encourages copy-pasting .env files across machines.",
    remediation:
      "Create a `.env.example` at the repo root that lists every variable the app reads, with safe placeholder values.",
    file: ".env.example",
    evaluate: (cwd) => existsSync(join(cwd, ".env.example")),
  },
  {
    ruleId: "env-hygiene.gitignore-missing-env",
    title: ".gitignore does not cover .env files",
    severity: "high",
    confidence: "high",
    description:
      ".gitignore does not reference any .env entry — local secret files can be committed accidentally.",
    rationale:
      "Once an .env file is committed to a public repo, credentials must be considered leaked. Rotating secrets is painful.",
    remediation:
      "Add `.env`, `.env.*`, and (optionally) `!.env.example` to the repo's .gitignore.",
    file: ".gitignore",
    evaluate: (cwd) => {
      const path = join(cwd, ".gitignore");
      if (!existsSync(path)) return false;
      const gi = readFileSync(path, "utf8");
      return /(^|\n)\.env/.test(gi);
    },
  },
  {
    ruleId: "env-hygiene.missing-gitignore",
    title: "Repository has no .gitignore",
    severity: "high",
    confidence: "high",
    description: "No .gitignore file is present; every artifact is tracked by default.",
    rationale:
      "Without a .gitignore, build output, local env files, and IDE state are all trackable by git, raising the chance of accidental commits of secrets.",
    remediation:
      "Add a .gitignore suited to the stack (e.g. Node/TS + Rust + Solana build output).",
    file: ".gitignore",
    evaluate: (cwd) => existsSync(join(cwd, ".gitignore")),
  },
];

// ─── Tool Definition ────────────────────────────────────────────────

const schema = z.object({
  cwd: z.string().describe("Repository root to check"),
});

export const envHygieneCheckTool = tool(
  async (input: z.infer<typeof schema>): Promise<string> => {
    const started = Date.now();
    const findings: Finding[] = [];

    for (const check of ENV_CHECKS) {
      const passes = check.evaluate(input.cwd);
      if (passes) continue;

      findings.push(
        makeFinding({
          tool: TOOL_NAME,
          ruleId: check.ruleId,
          title: check.title,
          kind: "misconfiguration",
          severity: check.severity,
          confidence: check.confidence,
          description: check.description,
          rationale: check.rationale,
          remediation: check.remediation,
          tags: ["env", "hygiene", "repo"],
          location: {
            kind: "config",
            file: check.file,
          },
        }),
      );
    }

    const result = makeToolResult({
      tool: TOOL_NAME,
      status: "ok",
      findings,
      durationMs: Date.now() - started,
      meta: { checks: ENV_CHECKS.length },
    });
    const header = `Environment Hygiene — ${findings.length} issue(s) out of ${ENV_CHECKS.length} checks.`;
    const withSummary = {
      ...result,
      humanSummary: [header, toHumanSummary(result, 20)].join("\n\n"),
    };

    return stringifyToolResult(withSummary);
  },
  {
    name: TOOL_NAME,
    description:
      "Validates repository environment configuration hygiene (.env.example presence, .gitignore covers .env, etc.). Returns a structured ToolResult with findings keyed under the `env-hygiene.*` rule namespace.",
    schema,
  },
);
