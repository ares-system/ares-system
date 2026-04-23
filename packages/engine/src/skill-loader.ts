import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SkillInfo {
  name: string;
  content: string;
  path: string;
}

/**
 * Discover skill directories. Checks:
 *   1. .agents/skills/  (skills.sh standard)
 *   2. .cursor/skills/  (Cursor standard)
 */
function findSkillsRoot(repoRoot: string): string | undefined {
  const candidates = [
    join(repoRoot, ".agents", "skills"),
    join(repoRoot, ".cursor", "skills"),
  ];
  return candidates.find((d) => existsSync(d));
}

/**
 * Load a single skill by reading its SKILL.md file.
 */
function loadSingleSkill(skillDir: string, skillName: string): SkillInfo | undefined {
  const skillPath = join(skillDir, skillName, "SKILL.md");
  if (!existsSync(skillPath)) return undefined;

  const raw = readFileSync(skillPath, "utf8");
  return { name: skillName, content: raw, path: skillPath };
}

/**
 * Load specific skills by name. Returns concatenated content ready for
 * injection into a system prompt.
 */
export function loadSkills(repoRoot: string, skillNames: string[]): string {
  const root = findSkillsRoot(repoRoot);
  if (!root) return "";

  const sections: string[] = [];
  for (const name of skillNames) {
    const skill = loadSingleSkill(root, name);
    if (skill) {
      sections.push(`\n--- SKILL: ${skill.name} ---\n${skill.content}\n--- END SKILL ---\n`);
    }
  }
  return sections.join("\n");
}

/**
 * List all installed skills.
 */
export function listInstalledSkills(repoRoot: string): SkillInfo[] {
  const root = findSkillsRoot(repoRoot);
  if (!root) return [];

  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const skills: SkillInfo[] = [];
  for (const name of dirs) {
    const skill = loadSingleSkill(root, name);
    if (skill) {
      skills.push(skill);
    }
  }
  return skills;
}
