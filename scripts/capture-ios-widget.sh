#!/usr/bin/env bash
#
# Capture the iOS home-screen widget shot (the "06-widget" shot) — the SpringBoard
# home screen with a configured Tesserone "CardList" widget showing the demo wallet.
#
# A home-screen widget can't be placed head­lessly (there is no simctl command for
# the widget gallery), so placement is a ONE-TIME manual step driven by idb taps —
# see the `screenshots` skill, "Widget shot". Once the widget is on the home screen
# it persists across re-seeds, so this script handles only the reproducible part:
# seed the demo wallet, launch the app (which mirrors the wallet into the App Group
# the widget reads — see src/services/widgets.ts), drop back to the home screen, and
# screenshot.
#
# The widget reads group.com.chipcolate.tesserone/widgets/snapshot.json (+ logos),
# which the app writes on launch via the WidgetBridge native module. That requires a
# build WITH entitlements applied (simulator ad-hoc signing is enough) — a build made
# with CODE_SIGNING_ALLOWED=NO has no App Group and the widget renders empty.
#
# Prereqs: booted iPhone (6.9": iPhone 16 Plus/Pro Max) with a signed Release build
# installed, the Tesserone CardList widget already placed on the home screen.
#
#   THEME=light ./scripts/capture-ios-widget.sh
#
set -euo pipefail

BUNDLE=com.chipcolate.tesserone
THEME="${THEME:-light}"
LOCALE="${LOCALE:-en}"
SIZE_SLUG="${SIZE_SLUG:-6.9-inch}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/screenshots/$SIZE_SLUG/$LOCALE"
mkdir -p "$OUT"

# idb is only needed to press the HOME button (simctl has no such command); same
# dependency as capture-ios.sh. Plain `idb` traceback-fails on Python 3.14, so
# default to a python@3.11 idb entrypoint when present. Override with $IDB.
IDB="${IDB:-}"
if [ -z "$IDB" ]; then
  if [ -x /opt/homebrew/opt/python@3.11/bin/python3.11 ]; then
    IDB="/opt/homebrew/opt/python@3.11/bin/python3.11 -m idb.cli.main"
  else
    IDB="idb"
  fi
fi

# Seed the demo wallet into the installed app's AsyncStorage (app must be stopped).
xcrun simctl terminate booted "$BUNDLE" >/dev/null 2>&1 || true; sleep 1
CONTAINER=$(xcrun simctl get_app_container booted "$BUNDLE" data)
node "$ROOT/scripts/inject-screenshot-state.mjs" --ios "$CONTAINER" "$THEME" "$LOCALE" >/dev/null

# Launch so startWidgetSync() writes the snapshot + logos into the App Group and
# calls WidgetCenter.reloadAllTimelines(); give it a beat to paint + sync.
xcrun simctl launch booted "$BUNDLE" >/dev/null 2>&1; sleep 7

# Drop back to the home screen (terminating the foreground app reveals SpringBoard,
# where the placed widget now renders the freshly-synced wallet).
xcrun simctl terminate booted "$BUNDLE" >/dev/null 2>&1 || true; sleep 3

# Terminating leaves SpringBoard on whatever page was last viewed; the widget lives
# on the FIRST home-screen page, so press HOME to jump there before capturing (a
# second press is idempotent and guarantees page 1).
$IDB ui button HOME >/dev/null 2>&1 || true; sleep 1
$IDB ui button HOME >/dev/null 2>&1 || true; sleep 2

xcrun simctl io booted screenshot --type=png "$OUT/06-widget.png" >/dev/null 2>&1
echo "    -> $SIZE_SLUG/$LOCALE/06-widget.png"
