#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
npm --prefix apps/asst-cli run build
if [[ -d assurance ]]; then
  node apps/asst-cli/dist/read-manifest.js "$ROOT"
else
  echo "e2e: no assurance/ yet — run deepagentsjs assurance writer first"
  exit 0
fi
