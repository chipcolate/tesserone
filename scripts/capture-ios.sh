#!/usr/bin/env bash
#
# Automated App Store screenshot capture for iOS, driven by idb + simctl.
#
# Seeds a deterministic demo wallet (scripts/inject-screenshot-state.mjs), then
# for each locale captures the 5-shot list from the `screenshots` skill into
# screenshots/<size>/<locale>/.
#
# Prereqs: booted iPhone 16 Pro Max sim with Tesserone (Release) installed,
# idb + idb_companion on PATH.
#
#   THEME=light UDID=<sim-udid> ./scripts/capture-ios.sh
#
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

BUNDLE=com.chipcolate.tesserone
UDID="${UDID:-E09F0D57-0F7B-45EF-92C2-D99B07313920}"
THEME="${THEME:-light}"
SIZE_SLUG="${SIZE_SLUG:-6.9-inch}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCALES=(${LOCALES:-en it fr es de})

shot()  { xcrun simctl io booted screenshot --type=png "$1" >/dev/null 2>&1; echo "    -> $(basename "$(dirname "$1")")/$(basename "$1")"; }
tap()   { idb ui tap --udid "$UDID" "$1" "$2" >/dev/null 2>&1; }
relaunch() { xcrun simctl terminate booted "$BUNDLE" >/dev/null 2>&1 || true; sleep 1; xcrun simctl launch booted "$BUNDLE" >/dev/null 2>&1; sleep 4; }

# Dismiss the "Open in Tesserone?" scheme-confirmation if (and only if) it shows.
confirm_open() {
  for _ in 1 2 3 4 5 6; do
    local c
    c=$(idb ui describe-all --udid "$UDID" 2>/dev/null | python3 -c '
import sys, json
try: items = json.loads(sys.stdin.read())
except Exception: sys.exit()
for el in items:
    if el.get("type") == "Button" and el.get("AXLabel") == "Open":
        f = el["frame"]; print(int(f["x"]+f["width"]/2), int(f["y"]+f["height"]/2)); break')
    if [ -n "$c" ]; then idb ui tap --udid "$UDID" $c >/dev/null 2>&1; sleep 2; return; fi
    sleep 0.5
  done
}

for L in "${LOCALES[@]}"; do
  echo "== locale: $L =="
  OUT="$ROOT/screenshots/$SIZE_SLUG/$L"
  mkdir -p "$OUT"
  CONTAINER=$(xcrun simctl get_app_container booted "$BUNDLE" data)
  xcrun simctl terminate booted "$BUNDLE" >/dev/null 2>&1 || true; sleep 1
  node "$ROOT/scripts/inject-screenshot-state.mjs" --ios "$CONTAINER" "$THEME" "$L" >/dev/null
  xcrun simctl launch booted "$BUNDLE" >/dev/null 2>&1; sleep 4

  # 01 — stack
  shot "$OUT/01-stack.png"

  # 02 — expanded (tap top card -> auto-flip to barcode)
  tap 220 330; sleep 2.5
  shot "$OUT/02-expanded.png"

  # 03 — add (brand fuzzy-match result)
  relaunch
  xcrun simctl openurl booted "tesserone://add" >/dev/null 2>&1; sleep 2
  confirm_open
  tap 220 292; sleep 1
  idb ui text --udid "$UDID" "Deca" >/dev/null 2>&1; sleep 1.5
  shot "$OUT/03-add.png"

  # 04 — detail/edit
  relaunch
  xcrun simctl openurl booted "tesserone://card/demo-decathlon" >/dev/null 2>&1; sleep 2
  confirm_open
  shot "$OUT/04-detail.png"

  # 05 — settings
  relaunch
  xcrun simctl openurl booted "tesserone://settings" >/dev/null 2>&1; sleep 2
  confirm_open
  shot "$OUT/05-settings.png"
done

echo "Done. $(find "$ROOT/screenshots/$SIZE_SLUG" -name '*.png' | wc -l | xargs) PNGs under screenshots/$SIZE_SLUG/"
