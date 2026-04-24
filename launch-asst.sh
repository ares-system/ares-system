#!/usr/bin/env bash
# ================================================
# ARES CLI Launcher — POSIX (macOS / Linux)
# Automated Resilience Evaluation System
#
# Mirrors Launch_ASST.bat. Invokes the built CLI with
# the repo root forwarded as ARES_REPO_ROOT.
# ================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$ROOT/apps/asst-cli"

export ARES_REPO_ROOT="$ROOT"

cd "$CLI_DIR"

if [[ $# -eq 0 ]]; then
  node dist/asst.js chat --repo "$ARES_REPO_ROOT"
else
  node dist/asst.js "$@"
fi
