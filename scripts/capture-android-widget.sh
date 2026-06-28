#!/usr/bin/env bash
#
# Capture the Android home-screen widget shot (the "06-widget" shot) — the Pixel
# launcher with a configured Tesserone "CardList" widget showing the demo wallet.
#
# Unlike the in-app shots (scripts/capture-android.sh), a home-screen widget can't
# be placed head­lessly: the stock launcher exposes no adb command to bind a widget,
# and the per-instance card selection lives in AsyncStorage under a launcher-assigned
# `widget:cfg:<widgetId>` key. So placement is a ONE-TIME manual step (see the
# `screenshots` skill, "Widget shot"); this script handles the reproducible part:
# seed the demo wallet, refresh the placed widget, and capture the home screen.
#
# IMPORTANT: the seed here is NON-destructive (it does NOT `DELETE FROM` the store)
# so the placed widget's `widget:cfg:*` selection survives. The demo card ids
# (demo-conad, …) are stable, so a re-seed keeps the widget's chosen cards valid.
#
# Prereqs: emulator booted, Tesserone installed as a *debuggable release* build with
# the CardList widget already placed + configured on the home screen, adb on PATH.
#
#   THEME=light ./scripts/capture-android-widget.sh
#
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

PKG=com.chipcolate.tesserone
THEME="${THEME:-light}"
LOCALE="${LOCALE:-en}"
SIZE_SLUG="${SIZE_SLUG:-android-phone}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK=/tmp/tess-android
OUT="$ROOT/screenshots/$SIZE_SLUG/$LOCALE"
mkdir -p "$OUT" "$WORK"

adb shell wm size 1080x2160 >/dev/null 2>&1; sleep 1

# Seed the demo wallet WITHOUT clearing the store, so widget:cfg:* survives. We
# pull the live DB (which holds the placed widget's config), layer the demo
# cards/settings on top via INSERT OR REPLACE, and push it back.
adb shell am force-stop "$PKG" >/dev/null 2>&1; sleep 1
adb exec-out run-as "$PKG" cat databases/RKStorage > "$WORK/RKStorage.live.db"
node "$ROOT/scripts/android-seed-sql.mjs" "$THEME" "$LOCALE" \
  | grep -v '^DELETE FROM' \
  | sqlite3 "$WORK/RKStorage.live.db"
adb push "$WORK/RKStorage.live.db" /data/local/tmp/RKStorage.db >/dev/null 2>&1
adb shell run-as "$PKG" cp /data/local/tmp/RKStorage.db databases/RKStorage
adb shell run-as "$PKG" rm -f databases/RKStorage-journal databases/RKStorage-wal databases/RKStorage-shm

# Launch once so startAndroidWidgetSync() fires requestWidgetUpdate() and the
# placed widget re-renders from the freshly-seeded store, then drop to home.
#
# Do NOT force-stop the app before the screenshot: react-native-android-widget
# renders the widget from a headless JS task owned by the app process, so a
# force-stop kills it mid-render and the widget repaints as its empty placeholder
# (just the Tesserone glyph). Leaving the app backgrounded lets the render settle.
adb shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1; sleep 7
adb shell input keyevent KEYCODE_HOME; sleep 4

adb exec-out screencap -p > "$OUT/06-widget.png"
echo "    -> $SIZE_SLUG/$LOCALE/06-widget.png"
