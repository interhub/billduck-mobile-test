#!/usr/bin/env bash
# Puts the kit fixtures where the system file picker can see them:
# Android - the Downloads folder of the running emulator;
# iOS - "On My iPhone" in the Files app of the booted simulator.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES="$ROOT/mobile-engineer-candidate-kit/fixtures"

if [ ! -f "$FIXTURES/oversize.csv" ]; then
  npm --prefix "$ROOT/mobile-engineer-candidate-kit" run fixtures:oversize --silent
fi

FILES=(statement.csv statement.pdf spoofed.pdf oversize.csv)

if command -v adb >/dev/null 2>&1 && adb get-state >/dev/null 2>&1; then
  for name in "${FILES[@]}"; do
    adb push "$FIXTURES/$name" "/sdcard/Download/$name" >/dev/null
  done
  # Lets the media scanner list the files in the picker right away.
  adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///sdcard/Download" >/dev/null 2>&1 || true
  echo "Android: fixtures are in Downloads"
else
  echo "Android: no running emulator, skipped"
fi

UDID="$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p' | head -n 1)"
if [ -n "$UDID" ]; then
  APP_GROUPS="$HOME/Library/Developer/CoreSimulator/Devices/$UDID/data/Containers/Shared/AppGroup"
  STORAGE=""
  for GROUP in "$APP_GROUPS"/*/; do
    IDENTIFIER="$(plutil -extract MCMMetadataIdentifier raw "$GROUP.com.apple.mobile_container_manager.metadata.plist" 2>/dev/null || true)"
    if [ "$IDENTIFIER" = "group.com.apple.FileProvider.LocalStorage" ]; then
      STORAGE="${GROUP}File Provider Storage"
      mkdir -p "$STORAGE"
    fi
  done
  if [ -z "$STORAGE" ]; then
    echo "iOS: open the Files app once on the simulator, then run this script again"
    exit 1
  fi
  for name in "${FILES[@]}"; do
    cp "$FIXTURES/$name" "$STORAGE/$name"
  done
  echo "iOS: fixtures are in Files > On My iPhone"
else
  echo "iOS: no booted simulator, skipped"
fi
