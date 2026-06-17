#!/usr/bin/env bash
#
# Automated Play Store screenshot capture for Android, driven by adb.
#
# Seeds a deterministic demo wallet into the AsyncStorage SQLite DB (RKStorage)
# via run-as (requires a debuggable build), then captures the 5-shot list per
# locale into screenshots/<size>/<locale>/ at 1080x2160 (2:1, Play-compliant).
#
# Cold-starts each screen and polls until the JS actually renders (pixel
# variance), because release cold-start can take ~10s on a loaded emulator.
#
# Prereqs: emulator booted, Tesserone installed as a *debuggable release* build,
# base DB pulled to $WORK/RKStorage.base.db, adb on PATH.
#
#   THEME=light ./scripts/capture-android.sh
#
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

PKG=com.chipcolate.tesserone
THEME="${THEME:-light}"
SIZE_SLUG="${SIZE_SLUG:-android-phone}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK=/tmp/tess-android
LOCALES=(${LOCALES:-en it fr es de})

# Tap targets at 1080x2160 (calibrated by probing).
CARD_TAP_X=540;  CARD_TAP_Y=760      # exposed strip of the 2nd card (Esselunga)
NAME_TAP_X=540;  NAME_TAP_Y=580      # add-screen card-name field

VAR_PY='from PIL import Image,ImageStat;import sys;im=Image.open(sys.argv[1]).convert("L").crop((0,140,1080,2060));print(round(ImageStat.Stat(im).stddev[0],1))'

screencap() { adb exec-out screencap -p > "$1"; echo "    -> $(basename "$(dirname "$1")")/$(basename "$1")"; }
force_stop() { adb shell am force-stop "$PKG" >/dev/null 2>&1; }
deeplink()  { adb shell am start -a android.intent.action.VIEW -d "$1" "$PKG" >/dev/null 2>&1; }
home_launch(){ adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; }

# Wait for the freshly-started screen to actually render (clear stale frame ->
# splash -> content). Content screens score >15 stddev; blank splash ~3-5.
wait_render() {
  sleep 3
  for _ in $(seq 1 20); do
    adb exec-out screencap -p > "$WORK/_w.png"
    local v; v=$(python3 -c "$VAR_PY" "$WORK/_w.png")
    if awk "BEGIN{exit !($v>15)}"; then sleep 1.5; return; fi
    sleep 1
  done
  sleep 1.5
}

seed() {
  force_stop; sleep 1
  cp "$WORK/RKStorage.base.db" "$WORK/RKStorage.db"
  node "$ROOT/scripts/android-seed-sql.mjs" "$THEME" "$1" | sqlite3 "$WORK/RKStorage.db"
  adb push "$WORK/RKStorage.db" /data/local/tmp/RKStorage.db >/dev/null 2>&1
  adb shell run-as "$PKG" cp /data/local/tmp/RKStorage.db databases/RKStorage
  adb shell run-as "$PKG" rm -f databases/RKStorage-journal
}

adb shell wm size 1080x2160 >/dev/null 2>&1; sleep 1

for L in "${LOCALES[@]}"; do
  echo "== locale: $L =="
  OUT="$ROOT/screenshots/$SIZE_SLUG/$L"; mkdir -p "$OUT"
  seed "$L"

  # 01 — stack
  force_stop; home_launch; wait_render
  screencap "$OUT/01-stack.png"

  # 02 — expanded (tap card -> auto-flip to barcode)
  adb shell input tap "$CARD_TAP_X" "$CARD_TAP_Y"; sleep 3
  screencap "$OUT/02-expanded.png"

  # 03 — add (brand fuzzy-match result, keyboard hidden)
  force_stop; deeplink "tesserone://add"; wait_render
  adb shell input tap "$NAME_TAP_X" "$NAME_TAP_Y"; sleep 1
  adb shell input text "Deca"; sleep 1.5
  adb shell input keyevent 4; sleep 1   # BACK: hide soft keyboard (stays on screen)
  screencap "$OUT/03-add.png"

  # 04 — detail/edit
  force_stop; deeplink "tesserone://card/demo-decathlon"; wait_render
  screencap "$OUT/04-detail.png"

  # 05 — settings
  force_stop; deeplink "tesserone://settings"; wait_render
  screencap "$OUT/05-settings.png"
done

echo "Done. $(find "$ROOT/screenshots/$SIZE_SLUG" -name '*.png' | wc -l | xargs) PNGs under screenshots/$SIZE_SLUG/"
