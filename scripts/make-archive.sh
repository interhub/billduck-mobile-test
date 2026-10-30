#!/usr/bin/env bash
# Builds billduck-mobile-test.zip for the reviewers from committed files only:
# a fresh clone with its .git history, plus builds/ with the ready-made builds and video/ if present.
# No node_modules, ios/, android/, .expo, mock state or generated oversize fixture get in.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="billduck-mobile-test"
OUT="$ROOT/$NAME.zip"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "Commit or stash the changes first: the archive holds committed files only." >&2
  exit 1
fi

git clone --quiet --no-hardlinks "$ROOT" "$WORK/$NAME"
# The clone remembers where it came from; the reviewers get the history, not a path on this Mac.
git -C "$WORK/$NAME" remote remove origin
rm -rf "$WORK/$NAME/.git/logs" "$WORK/$NAME/.git/FETCH_HEAD"
git -C "$WORK/$NAME" gc --quiet --prune=now

for folder in builds video; do
  if [ -d "$ROOT/$folder" ]; then
    cp -R "$ROOT/$folder" "$WORK/$NAME/$folder"
  fi
done

rm -f "$OUT"
(cd "$WORK" && zip -r -q -X "$OUT" "$NAME")
echo "$OUT: $(du -h "$OUT" | cut -f1)"
