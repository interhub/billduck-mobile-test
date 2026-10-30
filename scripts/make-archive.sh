#!/usr/bin/env bash
# Builds billduck-mobile-test.zip for the reviewers from committed files only:
# a fresh clone with its .git history, plus builds/ with the ready-made builds and video/ if present.
# No node_modules, ios/, android/, .expo, mock state or generated oversize fixture get in.
# Stops before packing when the clone holds a path of a developer machine, a string shaped like a
# key, or a name from the local blocklist.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="billduck-mobile-test"
OUT="$ROOT/$NAME.zip"
WORK="$(mktemp -d)"
CLONE="$WORK/$NAME"
trap 'rm -rf "$WORK"' EXIT

# Home folders of macOS and Linux, then key formats: generic sk-, AWS, GitHub, Google, Slack and
# PEM private keys. The brackets in "User[s]", "hom[e]" and "s[k]" keep this line from matching itself.
LEAK_PATTERN='/User[s]/|/hom[e]/[a-z]|(^|[^A-Za-z0-9])s[k]-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{35}|xox[abposr]-[A-Za-z0-9-]{10,}|BEGIN [A-Z ]*PRIVATE KEY'
# Names and paths of other projects, one per line, kept out of git so this script never holds them.
BLOCKLIST="$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir)/info/archive-blocklist"

# Lists every place of the clone that matches the git grep search given as arguments: the files of
# every commit and the commit messages. The whole history ships with the archive.
find_leaks() {
  local commits
  local status=0
  commits="$(git -C "$CLONE" rev-list --all)"
  # shellcheck disable=SC2086 # one commit hash per word
  git -C "$CLONE" grep -lI "$@" $commits -- || status=$?
  if [ "$status" -gt 1 ]; then
    echo "The leak search failed: git grep exit code $status." >&2
    exit 1
  fi
  if grep -q "$@" <<< "$(git -C "$CLONE" log --all --format=%B)"; then
    echo "a commit message"
  fi
}

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "Commit or stash the changes first: the archive holds committed files only." >&2
  exit 1
fi

for build in BillDuck-simulator.zip billduck-release.apk; do
  if [ ! -f "$ROOT/builds/$build" ]; then
    echo "builds/$build is missing: put the release builds into builds/ first." >&2
    exit 1
  fi
done
if [ ! -d "$ROOT/video" ]; then
  echo "video/ is missing: this archive goes out without the video." >&2
fi

git clone --quiet --no-hardlinks "$ROOT" "$CLONE"
# The clone remembers where it came from; the reviewers get the history, not a path on this Mac.
git -C "$CLONE" remote remove origin
rm -rf "$CLONE/.git/logs" "$CLONE/.git/FETCH_HEAD"
git -C "$CLONE" gc --quiet --prune=now

find_leaks -E "$LEAK_PATTERN" > "$WORK/leaks.txt"
if [ -f "$BLOCKLIST" ]; then
  grep -vE '^[[:space:]]*(#|$)' "$BLOCKLIST" > "$WORK/blocklist.txt" || true
fi
if [ -s "$WORK/blocklist.txt" ]; then
  find_leaks -i -F -f "$WORK/blocklist.txt" >> "$WORK/leaks.txt"
fi
if [ -s "$WORK/leaks.txt" ]; then
  echo "Nothing was packed: a machine path, a key or a blocked name is in these places." >&2
  cat "$WORK/leaks.txt" >&2
  exit 1
fi

for folder in builds video; do
  if [ -d "$ROOT/$folder" ]; then
    cp -R "$ROOT/$folder" "$CLONE/$folder"
  fi
done

rm -f "$OUT"
(cd "$WORK" && zip -r -q -X "$OUT" "$NAME")
echo "$OUT: $(du -h "$OUT" | cut -f1)"
