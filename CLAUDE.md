# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesserone is a loyalty card manager app with an Apple Wallet-style card stack interaction. Local-first, zero cloud, open source (MIT). Bundle ID: `com.chipcolate.tesserone`.

The legacy v1 app ("Cardshive") lives in `legacy/Cardshive/` for data model reference only.

## Tech Stack

- **Expo SDK 55** with React Native 0.83, TypeScript
- **expo-router** (file-based routing in `app/`)
- **react-native-reanimated 4.x** — all animations run on the UI thread via worklets
- **react-native-gesture-handler 2.x** — pan, tap, long-press gestures for the card stack
- **zustand** + AsyncStorage — state management with persistence
- **fuse.js** — fuzzy search over curated brand name index

Custom UI components throughout (no react-native-paper or third-party UI kits).

## Build & Run

```bash
# Install dependencies
bun install

# Dev build on physical device (required — no Expo Go or simulator)
npx expo run:ios --device

# Start Metro dev server (if not already running)
npx expo start --dev-client

# Preview build (ad-hoc, no dev client)
eas build --platform ios --local --profile preview

# Install IPA on device
xcrun devicectl device install app --device <DEVICE_UUID> <path-to-ipa>

# Production build
eas build --platform ios --local --profile production
eas build --platform android --local --profile production
```

## Architecture

### Routing (`app/`)
File-based routing via expo-router:
- `index.tsx` — home screen with card wallet stack and FAB menu
- `add.tsx` — add card (scan + manual), modal presentation
- `card/[id].tsx` — card detail/edit, modal presentation
- `settings.tsx` — theme, import/export, about
- `_layout.tsx` — root Stack with ThemeProvider + GestureHandlerRootView

### Card Stack (`src/components/wallet/`)
Apple Wallet-style card stack. Cards are `<Animated.View>` elements with transforms driven by shared values from `useCardStack`.

- `useCardStack.ts` — central hook: scroll, select/dismiss, flip, reorder shared values and gesture handlers
- `CardStack.tsx` — container with scroll pan gesture, layout measurement
- `CardItem.tsx` — single card: animated positioning, gesture composition, wobble for reorder mode
- `CardFace.tsx` — front face: brand logo or name-initial fallback, notes
- `CardBack.tsx` — back face: barcode rendering (EAN13, CODE128, QR, etc.)
- `CardFlip.tsx` — rotateY flip wrapper with opacity-based face swap

Interactions: vertical scroll with rubber-band overscroll, tap to expand, swipe up to dismiss, tap expanded card to flip (shows barcode + maxes brightness), long-press expanded card to edit, wobble + drag to reorder.

### State (`src/stores/`)
- `cards.ts` — card CRUD, reorder, sort (manual/alphabetical/dateCreated), filter by name/logoSlug
- `settings.ts` — theme mode (system/light/dark), sort mode

### Services (`src/services/`)
- `logos.ts` — curated brand database (fuse.js search, bundled PNG logos, custom upload via expo-image-picker)
- `scanner.ts` — barcode type mapping, validation, scan artifact fixes
- `importExport.ts` — JSON export via expo-sharing, import via expo-document-picker, v1 format migration, conflict resolution (keep existing/use imported/keep newer)
- `permissions.ts` — camera permission flow

### Theme (`src/theme/`)
- `colors.ts` — dark/light tokens, 27-color card palette (including black/grey/white), `isLightColor()`, `textOnColor()`
- `typography.ts` — system font scales (card name 18pt, barcode monospace, labels 14pt, etc.)
- `index.ts` — ThemeProvider with dynamic accent color, `useTheme()` hook

### Brand Logos (`data/brand-index.json` + `assets/logos/`)
Curated database of store logos (PNG). Each entry has: slug, name, aliases, alt text, primaryColor, secondaryColor, logo filename. Fuse.js fuzzy search for brand matching when adding cards.

To add a brand: drop PNG in `assets/logos/`, add `require()` in `BUNDLED_LOGOS` map in `logos.ts`, add entry to `brand-index.json`.

## Key Design Decisions

- **Apple Wallet UX** — cards at fixed stack spacing (170px), scroll to browse, tap to expand with mini-stack at bottom, swipe up to dismiss
- **Springs for transitions, raw values for scroll** — scroll tracking is 1:1 with finger (no spring lag), state transitions (select/dismiss/reorder) use springs
- **Brightness boost on barcode flip** — saves/restores device brightness automatically
- **Reorder mode** — FAB menu toggle, iOS home screen wobble, long-press + drag
- **Curated logos, not API** — bundled PNGs for offline-first, user upload for anything not in the set
- **v1 import compatibility** — lowercase format enums auto-migrated, missing fields get defaults

## Legacy App

`legacy/Cardshive/` contains the v1 app. Reference for data model compatibility only — don't modify. V2 uses a different bundle ID (`com.chipcolate.tesserone` vs `com.chipcolate.cardshive`).
