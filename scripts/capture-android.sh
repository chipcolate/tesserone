#!/usr/bin/env bash
#
# Automated Play Store screenshot capture for Android, driven by adb.
#
# Seeds a deterministic demo wallet into the AsyncStorage SQLite DB (RKStorage)
# via run-as (requires a debuggable build), then captures the 6-shot list per
# locale into screenshots/<size>/<locale>/ at 1080x2160 (2:1, Play-compliant).
#
# Cold-starts each screen and polls until our app is foregrounded AND the JS has
# painted (pixel variance), because release cold-start can take ~10s on a loaded
# emulator and a dropped deep link would otherwise capture the launcher. Failed
# launches are retried, then skipped and reported (non-zero exit) rather than
# saved as a wrong-screen capture.
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

VAR_PY='from PIL import Image,ImageStat;import sys;im=Image.open(sys.argv[1]).convert("L").crop((0,140,1080,2060));print(round(ImageStat.Stat(im).stddev[0],1))'

screencap() { adb exec-out screencap -p > "$1"; echo "    -> $(basename "$(dirname "$1")")/$(basename "$1")"; }
force_stop() { adb shell am force-stop "$PKG" >/dev/null 2>&1; }
deeplink()  { adb shell am start -a android.intent.action.VIEW -d "$1" "$PKG" >/dev/null 2>&1; }
home_launch(){ adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; }

# Tap an in-app element located by a python selector over the uiautomator view
# hierarchy. The selector reads the dump XML on stdin and prints "<x> <y>" for
# the element to tap. Frame-based so it survives the wizard's localized labels.
ax_tap() {
  adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1
  local c
  c=$(adb exec-out cat /sdcard/_ui.xml 2>/dev/null | python3 -c "$1" 2>/dev/null)
  [ -n "$c" ] && adb shell input tap $c >/dev/null 2>&1
}

# Step 1 method tiles are the clickable, content-described nodes in the upper
# region; the 3rd from the top is "type it in" (reveals + focuses manual entry).
SEL_TYPEIT='
import sys, re, xml.etree.ElementTree as ET
root = ET.fromstring(sys.stdin.read())
tiles = []
for n in root.iter("node"):
    if n.get("clickable") == "true" and n.get("content-desc"):
        x1, y1, x2, y2 = map(int, re.findall(r"\d+", n.get("bounds"))[:4])
        cy = (y1 + y2) // 2
        if cy < 1400:
            tiles.append((cy, (x1 + x2) // 2))
tiles.sort()
if len(tiles) >= 3:
    print(tiles[2][1], tiles[2][0])'

# The wizard ActionBar Back/Next sit in the bottom region; right-most is Next.
SEL_NEXT='
import sys, re, xml.etree.ElementTree as ET
root = ET.fromstring(sys.stdin.read())
btns = []
for n in root.iter("node"):
    if n.get("clickable") == "true" and n.get("content-desc"):
        x1, y1, x2, y2 = map(int, re.findall(r"\d+", n.get("bounds"))[:4])
        cy = (y1 + y2) // 2
        if cy > 1400:
            btns.append((cy, (x1 + x2) // 2))
if btns:
    b = max(btns, key=lambda e: e[1])
    print(b[1], b[0])'

# True when our app's main activity is the resumed (topmost) activity.
app_foreground() {
  adb shell dumpsys activity activities 2>/dev/null \
    | grep -m1 'topResumedActivity' | grep -q "$PKG/.MainActivity"
}

# Wait for the freshly-started screen to actually render: our app must be in the
# foreground AND content must have painted. The pixel-variance check alone is
# NOT enough — the launcher/home screen also scores high, so a deep link that
# gets dropped during cold-start would silently capture the wrong screen. Both
# signals are required. Returns non-zero if it never settles.
wait_render() {
  sleep 3
  for _ in $(seq 1 20); do
    if app_foreground; then
      adb exec-out screencap -p > "$WORK/_w.png"
      local v; v=$(python3 -c "$VAR_PY" "$WORK/_w.png")
      if awk "BEGIN{exit !($v>15)}"; then sleep 1.5; return 0; fi
    fi
    sleep 1
  done
  return 1
}

# Cold-start a screen and wait for it to render, retrying the start command if
# the app never reaches the foreground (deep links occasionally get dropped on
# release cold-start). Usage: launch <label> <cmd...>. Returns non-zero if all
# attempts fail, so the caller can skip the shot rather than capture garbage.
launch() {
  local label="$1"; shift
  local attempt
  for attempt in 1 2 3; do
    force_stop; "$@"
    if wait_render; then return 0; fi
    echo "    ! $label did not foreground (attempt $attempt/3), retrying"
  done
  echo "    !! $label FAILED to render after 3 attempts" >&2
  return 1
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

FAILED=()

for L in "${LOCALES[@]}"; do
  echo "== locale: $L =="
  OUT="$ROOT/screenshots/$SIZE_SLUG/$L"; mkdir -p "$OUT"
  seed "$L"

  # 01 — stack / 02 — expanded (tap card -> auto-flip to barcode). 02 acts on
  # the same running instance, so it only makes sense if 01 came up.
  if launch "$L/01-stack" home_launch; then
    screencap "$OUT/01-stack.png"
    adb shell input tap "$CARD_TAP_X" "$CARD_TAP_Y"; sleep 3
    screencap "$OUT/02-expanded.png"
  else
    FAILED+=("$L/01-stack" "$L/02-expanded")
  fi

  # 03a — add: Step 1 method chooser. 03b drives the same instance to Step 2.
  if launch "$L/03a-add-method" deeplink "tesserone://add"; then
    screencap "$OUT/03a-add-method.png"

    # 03b — Step 2 brand search: open "type it in", enter a valid barcode,
    # advance to Brand, type a partial name to surface logo results.
    ax_tap "$SEL_TYPEIT"; sleep 1
    adb shell input text "8004620150741"; sleep 1
    adb shell input keyevent 4; sleep 0.8   # hide keyboard so it doesn't cover Next
    ax_tap "$SEL_NEXT"; sleep 1.5
    adb shell input text "Deca"; sleep 1.5
    adb shell input keyevent 4; sleep 1   # BACK: hide soft keyboard (stays on screen)
    screencap "$OUT/03b-add-brand.png"
  else
    FAILED+=("$L/03a-add-method" "$L/03b-add-brand")
  fi

  # 04 — detail/edit
  if launch "$L/04-detail" deeplink "tesserone://card/demo-decathlon"; then
    screencap "$OUT/04-detail.png"
  else
    FAILED+=("$L/04-detail")
  fi

  # 05 — settings
  if launch "$L/05-settings" deeplink "tesserone://settings"; then
    screencap "$OUT/05-settings.png"
  else
    FAILED+=("$L/05-settings")
  fi
done

echo "Done. $(find "$ROOT/screenshots/$SIZE_SLUG" -name '*.png' | wc -l | xargs) PNGs under screenshots/$SIZE_SLUG/"
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "WARNING: ${#FAILED[@]} shot(s) failed to render and were skipped:" >&2
  printf '  - %s\n' "${FAILED[@]}" >&2
  exit 1
fi
