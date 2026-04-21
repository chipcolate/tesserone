# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesserone is a loyalty card manager app with an Apple Wallet-style card stack interaction. Local-first, zero cloud, open source (Apache 2.0). Bundle ID: `com.chipcolate.tesserone`.

The repo also contains a static landing/privacy site under `site/`, built with Astro and deployed to GitHub Pages.

## Tech Stack

**App (repo root)**

- **Expo SDK 55** with React Native 0.83, TypeScript
- **expo-router** (file-based routing in `app/`)
- **react-native-reanimated 4.x** — all animations run on the UI thread via worklets
- **react-native-gesture-handler 2.x** — pan, tap, long-press gestures for the card stack
- **zustand** + AsyncStorage — state management with persistence
- **i18next / react-i18next** + `expo-localization` — app i18n (en, it, fr, es, de)
- **fuse.js** — fuzzy search over curated brand name index

Custom UI components throughout (no react-native-paper or third-party UI kits).

**Landing site (`site/`)**

- **Astro 6** + **Tailwind CSS 4**
- Astro i18n with en/it/fr/es/de; default locale (en) lives at `/tesserone/`
- Deployed to GitHub Pages via `.github/workflows/deploy-site.yml` on pushes touching `site/**`

## Build & Run

### App

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

### Landing site

```bash
cd site
bun install
bun run dev     # local preview at http://localhost:4321/tesserone/
bun run build   # static output to site/dist/
```

## Architecture

### Routing (`app/`)

File-based routing via expo-router:

- `index.tsx` — home screen with card wallet stack and FAB menu
- `add.tsx` — add card (scan + manual), modal presentation
- `card/[id].tsx` — card detail/edit, modal presentation
- `settings.tsx` — theme, language, import/export, about
- `_layout.tsx` — root Stack with ThemeProvider, GestureHandlerRootView, KeyboardProvider, SafeAreaProvider, i18n bootstrap, and ErrorBoundary

### Card Stack (`src/components/wallet/`)

Apple Wallet-style card stack. Cards are `<Animated.View>` elements with transforms driven by shared values from `useCardStack`.

- `useCardStack.ts` — central hook: scroll, select/dismiss, flip, reorder shared values and gesture handlers
- `CardStack.tsx` — container with scroll pan gesture, layout measurement
- `CardItem.tsx` — single card: animated positioning, gesture composition, wobble for reorder mode
- `CardFace.tsx` — front face: brand logo or full-name fallback
- `CardBack.tsx` — back face: barcode rendering (EAN13, CODE128, QR, etc.) + notes
- `CardFlip.tsx` — rotateY flip wrapper with opacity-based face swap

Interactions: vertical scroll with rubber-band overscroll, tap to expand and auto-flip to the barcode (maxes brightness), tap again or swipe up to dismiss, long-press expanded card to edit, wobble + drag to reorder.

### UI & Tutorial (`src/components/`)

- `ui/LogoSelector.tsx` — brand picker with fuzzy search plus custom image upload
- `tutorial/TutorialOverlay.tsx` — first-run overlay coaching the card-stack interactions
- `tutorial/useActiveTutorialStep.ts` — drives which step is visible based on app state

### State (`src/stores/`)

- `cards.ts` — card CRUD, reorder, sort (manual/alphabetical/dateCreated), filter by name/logoSlug
- `settings.ts` — theme mode (system/light/dark), sort mode, language preference
- `tutorial.ts` — first-run tutorial progression state

### Services (`src/services/`)

- `logos.ts` — curated brand database (fuse.js search, bundled PNG logos, custom upload via expo-image-picker)
- `scanner.ts` — barcode type mapping, validation, scan-artifact fixes
- `importExport.ts` — JSON export via expo-sharing, import via expo-document-picker, tolerant import parsing (lowercase barcode enums migrated, missing fields defaulted), conflict resolution (keep existing/use imported/keep newer)

Camera and photo-library permissions are handled inline at the call site via `expo-camera` / `expo-image-picker`; there is no standalone permissions service.

### Internationalization (`src/i18n/`)

- `index.ts` — initializes i18next, resolves language from settings (with `system` falling back to device locale via `expo-localization`)
- `locales/{en,it,fr,es,de}.ts` — translation dictionaries
- `languages.ts` — supported-language metadata, default, system-locale resolver
- `format.ts` — locale-aware number/date formatting helpers

Components consume translations with `useTranslation()` from `react-i18next`.

### Theme (`src/theme/`)

- `colors.ts` — dark/light tokens, 27-color card palette (including black/grey/white), `isLightColor()`, `textOnColor()`
- `typography.ts` — system font scales (card name 18pt, barcode monospace, labels 14pt, etc.)
- `index.ts` — ThemeProvider with dynamic accent color, `useTheme()` hook

### Brand Logos (`data/brand-index.json` + `assets/logos/`)

Curated database of store logos (PNG). Each entry has: slug, name, aliases, alt text, primaryColor, secondaryColor, logo filename. Fuse.js fuzzy search for brand matching when adding cards.

To add a brand: drop PNG in `assets/logos/`, add `require()` in the `BUNDLED_LOGOS` map in `logos.ts`, add the entry to `brand-index.json`.

### Landing Site (`site/`)

- `src/pages/index.astro`, `privacy.astro`, `[lang]/…` — routes
- `src/components/` — section components (Hero, FeatureList, Backstory, OSSection, StoreCTAs, Footer, ThemeToggle)
- `src/i18n/{en,it,fr,es,de}.ts` — per-language strings
- `astro.config.mjs` — `site: 'https://chipcolate.github.io'`, `base: '/tesserone'`, i18n locales, default locale `en` has no URL prefix

### Store Listing Copy (`store/`)

- `app-store-listing.md` — localized App Store Connect copy (name, subtitle, promo, description, keywords) per supported language

## Key Design Decisions

- **Apple Wallet UX** — cards at fixed stack spacing (170px), scroll to browse, tap to expand+flip to barcode with mini-stack at bottom, tap or swipe up to dismiss
- **Springs for transitions, raw values for scroll** — scroll tracking is 1:1 with finger (no spring lag), state transitions (select/dismiss/reorder) use springs
- **Brightness boost on expand** — saves/restores device brightness automatically when the barcode appears
- **Reorder mode** — FAB menu toggle, iOS home screen wobble, long-press + drag
- **Curated logos, not API** — bundled PNGs for offline-first, user upload for anything not in the set
- **Offline by default** — the app makes no network requests in normal use; nothing is sent off-device
- **Tolerant import format** — accepts exports with lowercase barcode enums or missing fields (normalized/defaulted on import)
