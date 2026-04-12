#!/usr/bin/env bash
# Colosseum Copilot — competitor discovery for ASST (security-tooling track).
# PAT: export COLOSSEUM_COPILOT_PAT, or put it in repo-root `.env` or `deepagentsjs/.env` (not committed).
# Optional: COLOSSEUM_COPILOT_API_BASE (default https://copilot.colosseum.com/api/v1)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load .env when PAT is not already in the environment (shell export wins).
load_env_if_needed() {
  [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]] && return 0
  local f="$1"
  [[ -f "$f" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$f"
  set +a
}

load_env_if_needed "$REPO_ROOT/.env"
load_env_if_needed "$REPO_ROOT/deepagentsjs/.env"

BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"
BASE="${BASE%/}"
PAT="${COLOSSEUM_COPILOT_PAT:-}"

# Trim whitespace and CR (common .env copy/paste issues)
trim_ws() {
  local s="$1"
  s="${s//$'\r'/}"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}
PAT="$(trim_ws "$PAT")"

if [[ -z "$PAT" ]]; then
  echo "error: COLOSSEUM_COPILOT_PAT missing" >&2
  echo "  Add to ${REPO_ROOT}/.env or ${REPO_ROOT}/deepagentsjs/.env:" >&2
  echo "    COLOSSEUM_COPILOT_PAT=<token from https://arena.colosseum.org/copilot>" >&2
  echo "  Or: export COLOSSEUM_COPILOT_PAT=..." >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${PAT}")
json=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

status_body="$(curl -sS "${auth[@]}" "$BASE/status")"

echo "## Copilot /status"
echo "$status_body"
echo ""

# Fail fast on invalid/expired PAT (do not call search endpoints)
status_ok=1
if command -v python3 >/dev/null 2>&1; then
  echo "$status_body" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(1)
if d.get("code") == "UNAUTHORIZED":
    sys.exit(1)
if d.get("authenticated") is True:
    sys.exit(0)
sys.exit(1)
' && status_ok=0 || true
else
  if echo "$status_body" | grep -q '"authenticated"[[:space:]]*:[[:space:]]*true'; then
    status_ok=0
  fi
fi

if [[ "$status_ok" -ne 0 ]]; then
  echo "error: Copilot auth failed (expected authenticated: true from GET /status)." >&2
  echo "  Mint a new PAT at https://arena.colosseum.org/copilot (tokens expire ~90 days)." >&2
  echo "  Check COLOSSEUM_COPILOT_API_BASE matches production: https://copilot.colosseum.com/api/v1" >&2
  echo "  Ensure .env has no extra quotes/spaces around the token value." >&2
  exit 1
fi

echo ""

search() {
  local label="$1"
  local body="$2"
  echo "### ${label}"
  curl -sS -X POST "${json[@]}" -d "$body" "$BASE/search/projects"
  echo ""
  echo ""
}

search "projects: Solana security tooling (broad)" '{"query":"Solana security audit CI","limit":15}'
search "projects: static analysis / SARIF" '{"query":"static analysis SARIF","limit":15}'
search "projects: acceleratorOnly" '{"query":"program security","limit":15,"filters":{"acceleratorOnly":true}}'
search "projects: winnersOnly" '{"query":"program security","limit":15,"filters":{"winnersOnly":true}}'

echo "### archives (concept framing)"
curl -sS -X POST "${json[@]}" -d '{"query":"software supply chain audit","limit":5}' "$BASE/search/archives"
echo ""
