#!/usr/bin/env node
/**
 * Read latest `assurance/run-*.json` and print a short summary (CLI surface per product plan).
 * Usage: node dist/read-manifest.js [path-to-assurance-dir]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function main() {
  const root = resolve(process.argv[2] ?? process.cwd(), "assurance");
  const names = readdirSync(root).filter((n: string) =>
    /^run-.*\.json$/.test(n),
  );
  if (!names.length) {
    console.error(`No run-*.json in ${root}`);
    process.exit(1);
  }
  names.sort();
  const latest = names[names.length - 1];
  const data = JSON.parse(
    readFileSync(join(root, latest), "utf8"),
  ) as Record<string, unknown>;
  const git = data.git as Record<string, unknown> | undefined;
  console.log(JSON.stringify({ file: latest, git, tools: data.tools }, null, 2));
}

main();
