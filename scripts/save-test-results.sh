#!/usr/bin/env bash
# Runs every check and saves its output to docs/test-results/<name>.txt with the date, the command
# and the exit code. The integration run starts its own mock, so no other process is needed.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/test-results"
mkdir -p "$OUT"
cd "$ROOT"

FAILED=0

run() {
  local name="$1"
  shift
  local file="$OUT/$name.txt"
  {
    echo "date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "command: $*"
    echo
  } > "$file"
  "$@" >> "$file" 2>&1
  local status=$?
  printf '\nresult: exit code %s\n' "$status" >> "$file"
  echo "$name: exit code $status"
  if [ "$status" -ne 0 ]; then
    FAILED=1
  fi
}

run typecheck npm run typecheck
run lint npm run lint
run unit-tests npm test -- --verbose
run integration-tests npm run test:integration -- --verbose
run kit-mock-tests npm --prefix mobile-engineer-candidate-kit test

exit "$FAILED"
