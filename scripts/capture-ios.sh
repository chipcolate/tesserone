#!/usr/bin/env bash
#
# Automated App Store screenshot capture for iOS, driven by idb + simctl.
#
# Seeds a deterministic demo wallet (scripts/inject-screenshot-state.mjs), then
# for each locale captures the 6-shot list from the `screenshots` skill into
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

# Tap an in-app element located by a python selector over idb's AX tree. The
# selector reads describe-all JSON on stdin and prints "<x> <y>" (screen centre)
# for the element to tap. Frame-based so it survives device size + locale shifts
# (the add-card wizard's labels are localized; positions/structure are not).
ax_tap() {
  local c
  c=$(idb ui describe-all --udid "$UDID" 2>/dev/null | python3 -c "$1" 2>/dev/null)
  [ -n "$c" ] && idb ui tap --udid "$UDID" $c >/dev/null 2>&1
}

# Step 1 of the wizard: the method tiles are the only AX "Button" elements;
# the 3rd from the top is "type it in" (reveals + focuses the manual code field).
SEL_TYPEIT='
import sys, json
items = json.loads(sys.stdin.read())
btns = sorted((e for e in items if e.get("type") == "Button"), key=lambda e: e["frame"]["y"])
if len(btns) >= 3:
    f = btns[2]["frame"]; print(int(f["x"] + f["width"]/2), int(f["y"] + f["height"]/2))'

# The wizard ActionBar Back/Next render as labelled GenericElements at the
# bottom; the right-most of the bottom pair is Next.
SEL_NEXT='
import sys, json
items = json.loads(sys.stdin.read())
els = [e for e in items if e.get("AXLabel") and e.get("type") == "GenericElement"]
if els:
    maxy = max(e["frame"]["y"] for e in els)
    bottom = [e for e in els if e["frame"]["y"] >= maxy - 40]
    b = max(bottom, key=lambda e: e["frame"]["x"])
    f = b["frame"]; print(int(f["x"] + f["width"]/2), int(f["y"] + f["height"]/2))'

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

  # 03a — add: Step 1 method chooser (the guided wizard's entry point)
  relaunch
  xcrun simctl openurl booted "tesserone://add" >/dev/null 2>&1; sleep 2
  confirm_open
  shot "$OUT/03a-add-method.png"

  # 03b — add: Step 2 brand search with logo results. Drive past Step 1 by
  # opening "type it in", entering a valid barcode, then advancing to Brand.
  ax_tap "$SEL_TYPEIT"; sleep 0.8
  idb ui text --udid "$UDID" "8004620150741" >/dev/null 2>&1; sleep 0.6
  ax_tap "$SEL_NEXT"; sleep 1.2
  idb ui text --udid "$UDID" "Deca" >/dev/null 2>&1; sleep 1.5
  shot "$OUT/03b-add-brand.png"

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
