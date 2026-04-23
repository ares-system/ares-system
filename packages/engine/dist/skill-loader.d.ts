export interface SkillInfo {
    name: string;
    content: string;
    path: string;
}
/**
 * Load specific skills by name. Returns concatenated content ready for
 * injection into a system prompt.
 */
export declare function loadSkills(repoRoot: string, skillNames: string[]): string;
/**
 * List all installed skills.
 */
export declare function listInstalledSkills(repoRoot: string): SkillInfo[];
