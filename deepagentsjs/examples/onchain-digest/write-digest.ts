#!/usr/bin/env node
/**
 * P5 scaffold: build a memo payload from a manifest hash and print base64 (optional send when wired).
 * Does not ship private keys; extend with @solana/web3.js Transaction + send when ready.
 */
import { createHash } from "node:crypto";

function parseArgs(): { manifestSha256: string } {
  const manifestIdx = process.argv.indexOf("--manifest-sha256");
  if (manifestIdx === -1 || !process.argv[manifestIdx + 1]) {
    console.error(
      "Usage: write-digest.ts --manifest-sha256 <64-char-hex> [--dry-run]",
    );
    process.exit(1);
  }
  return { manifestSha256: process.argv[manifestIdx + 1] };
}

function main() {
  const { manifestSha256 } = parseArgs();
  if (!/^[a-f0-9]{64}$/i.test(manifestSha256)) {
    console.error("manifest-sha256 must be 64 hex chars");
    process.exit(1);
  }
  const payload = Buffer.from(
    `ASST_ASSURANCE_V1:${manifestSha256.toLowerCase()}`,
    "utf8",
  );
  const digest = createHash("sha256").update(payload).digest("hex");
  console.log(
    JSON.stringify(
      {
        scheme: "ASST_ASSURANCE_V1",
        manifest_sha256: manifestSha256.toLowerCase(),
        payload_sha256: digest,
        memo_utf8: payload.toString("utf8"),
      },
      null,
      2,
    ),
  );
}

main();
