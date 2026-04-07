# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesserone is a loyalty card manager app (v2 rewrite of "Cardshive") with an Apple Wallet-style card stack interaction. Local-first, zero cloud, open source (MIT). Bundle ID: `com.chipcolate.tesserone`.

The legacy v1 app lives in `legacy/Cardshive/`. The v2 app will be built from scratch in the repo root following the architecture in `PLAN.md`.

## Tech Stack

- **Expo SDK 55** with React Native 0.83, TypeScript
- **expo-router** (file-based routing in `app/`)
- **react-native-reanimated 4.x** — all animations run on the UI thread via worklets
- **react-native-gesture-handler 2.x** — pan, tap, long-press gestures for the card stack
- **zustand** + AsyncStorage — state management with persistence
- **Simple Icons** — bundled brand SVGs (CC0) for store logos on card faces
- **fuse.js** — fuzzy search over brand name index
- **lucide-react-native** — UI icons (replaces react-native-vector-icons from v1)

No react-native-paper in v2 (custom UI components for full visual control).

## Build & Run

```bash
# Install dependencies
bun install          # or npm install

# Start dev server
bun start            # or npx expo start

# Run on device/simulator
bun run ios          # or npx expo run:ios
bun run android      # or npx expo run:android

# Production builds (local only, no EAS cloud)
eas build --platform ios --local --profile production
eas build --platform android --local --profile production
```

**Important:** Use dev builds, not Expo Go — Reanimated 4 and Gesture Handler require native modules.

## Architecture

### Routing (`app/`)
File-based routing via expo-router: `index.tsx` (home/wallet), `add.tsx` (add card modal), `card/[id].tsx` (card detail), `settings.tsx`.

### Card Stack System (`src/components/wallet/`)
The core of the app. Cards are `<Animated.View>` elements with transforms driven by shared values from the `useCardStack` hook. The stack supports: fan/scroll, tap-to-expand, swipe-to-dismiss, card flip (rotateY), long-press-to-reorder, and inline search filtering.

All animations use `withSpring()` (not `withTiming()`, except for opacity fades). Card positions are computed from scroll offset, selection state, and drag state.

### State (`src/stores/`)
- `cards.ts` — card CRUD, ordering, filtered queries
- `settings.ts` — theme mode, sort preference

### Services (`src/services/`)
- `logos.ts` — brand index loading, fuse.js search, SVG resolution, color extraction
- `scanner.ts` — barcode validation and format mapping
- `importExport.ts` — JSON import/export with merge strategies
- `permissions.ts` — camera permission flow

### Theme (`src/theme/`)
Dynamic accent color derived from the top card's brand color. Background: `#0A0A0A` dark / `#FAFAF8` light. System fonts only.

### Data (`data/brand-index.json`)
Generated at build time from Simple Icons dataset. Maps brand names/aliases to slugs with category tags.

## Key Design Decisions

- **Springs everywhere** — `withSpring()` is the default animation. Specific spring configs per interaction (see PLAN.md "Spring configs" section).
- **Logo colors are original** — brand SVGs render in their official colors, not tinted. Card background is auto-derived from brand hex.
- **Full-screen barcode via gesture only** — long-press triggers it, no button.
- **Sort modes:** manual (drag reorder), alphabetical, date created.
- **v1 data compatibility** — v1 JSON imports work; missing fields get defaults (`logoSlug`: absent, `sortIndex`: creation order).
- **Card flip** uses `rotateY` with `backfaceVisibility: 'hidden'` on front/back children — standard Reanimated pattern, no Skia needed.

## Legacy App

`legacy/Cardshive/` contains the v1 app (Expo + react-native-paper + @react-navigation). Reference it for data model compatibility but don't modify it. The v2 app uses a different bundle ID and is a new app listing, not an in-place upgrade.
