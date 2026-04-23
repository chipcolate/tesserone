#!/usr/bin/env bash
#
# Interactive helper for capturing App Store screenshots from a booted iOS simulator.
#
# Usage:
#   ./scripts/capture-screenshots.sh <size> <locale>
#   ./scripts/capture-screenshots.sh 6.9 en
#
# Prerequisites (macOS only):
#   - Xcode + Command Line Tools
#   - The Tesserone .app installed on the booted simulator (e.g. via
#     `npx expo run:ios --simulator` or drop the .app on the simulator window)
#   - Simulator already set to the target locale — either:
#       a) Simulator's own Settings → General → Language & Region → iPhone Language,
#          OR
#       b) Inside Tesserone: Settings → Language → pick it/fr/es/de/en
#     (expo-localization reads the system locale at launch and the in-app setting
#      overrides it, so either works.)
#
# The script will:
#   - Confirm the booted simulator matches the requested size
#   - Create screenshots/{size}-inch/{locale}/
#   - Prompt you to navigate to each shot, then capture with Enter
#
# Output filenames follow the shot list in store/screenshots.md.

set -euo pipefail

SIZE="${1:-}"
LOCALE="${2:-}"

if [[ -z "$SIZE" || -z "$LOCALE" ]]; then
  cat >&2 <<EOF
Usage: $0 <size> <locale>
  size:   6.9 or 6.5
  locale: en | it | fr | es | de
EOF
  exit 1
fi

case "$SIZE" in
  6.9) EXPECTED_DEVICE="iPhone 16 Pro Max" ; SIZE_SLUG="6.9-inch" ;;
  6.5) EXPECTED_DEVICE="iPhone 14 Plus"    ; SIZE_SLUG="6.5-inch" ;;
  *)   echo "Unsupported size: $SIZE (use 6.9 or 6.5)" >&2 ; exit 1 ;;
esac

case "$LOCALE" in
  en|it|fr|es|de) ;;
  *) echo "Unsupported locale: $LOCALE (use en|it|fr|es|de)" >&2 ; exit 1 ;;
esac

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun not found — this script requires macOS with Xcode installed." >&2
  exit 1
fi

# Identify the booted simulator and confirm it matches the requested size.
BOOTED_LINE=$(xcrun simctl list devices booted | awk '/\(Booted\)/ {print; exit}')
if [[ -z "$BOOTED_LINE" ]]; then
  echo "No simulator is booted. Boot one first:" >&2
  echo "  xcrun simctl boot \"$EXPECTED_DEVICE\"" >&2
  exit 1
fi

BOOTED_NAME=$(echo "$BOOTED_LINE" | sed -E 's/^[[:space:]]*([^(]+)\([A-F0-9-]+\) \(Booted\).*/\1/' | sed -E 's/[[:space:]]+$//')

if [[ "$BOOTED_NAME" != "$EXPECTED_DEVICE" ]]; then
  echo "Booted simulator is '$BOOTED_NAME', expected '$EXPECTED_DEVICE' for the $SIZE\" size." >&2
  echo "Shut it down and boot the right one:" >&2
  echo "  xcrun simctl shutdown all" >&2
  echo "  xcrun simctl boot \"$EXPECTED_DEVICE\"" >&2
  exit 1
fi

OUT_DIR="screenshots/${SIZE_SLUG}/${LOCALE}"
mkdir -p "$OUT_DIR"

# Shot slug : human description (keep in sync with store/screenshots.md)
SHOTS=(
  "01-stack:Home — card stack visible, 4–6 colorful cards"
  "02-expanded:Expanded card with barcode visible + mini-stack at bottom"
  "03-add:Add Card modal — brand picker showing a fuzzy-match result"
  "04-detail:Card detail/edit screen with filled-in fields"
  "05-settings:Settings — language, theme, import/export visible"
)

echo ""
echo "Capturing ${SIZE}-inch shots in locale '${LOCALE}' on '$BOOTED_NAME'"
echo "Output: ${OUT_DIR}/"
echo ""

for entry in "${SHOTS[@]}"; do
  slug="${entry%%:*}"
  desc="${entry#*:}"
  printf "── %s ──\n   %s\n" "$slug" "$desc"
  read -rp "   Navigate on the simulator, then press [Enter] to capture ('s' to skip): " key
  if [[ "$key" == "s" ]]; then
    echo "   skipped"
    continue
  fi
  xcrun simctl io booted screenshot --type=png "${OUT_DIR}/${slug}.png" >/dev/null
  echo "   saved → ${OUT_DIR}/${slug}.png"
  echo ""
done

echo "Done. $(find "$OUT_DIR" -maxdepth 1 -name '*.png' | wc -l | xargs) files in ${OUT_DIR}/"
