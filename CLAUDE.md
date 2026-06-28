# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesserone is a loyalty card manager app with an Apple Wallet-style card stack interaction. Local-first, zero cloud, open source (Apache 2.0). Bundle ID: `com.chipcolate.tesserone`.

It ships with an **Apple Watch companion** (wrist-launchable barcodes), **home-screen widgets** (iOS + Android — tap a card to open straight to its barcode), a **share extension** (share an image into the app to auto-detect its barcode), and the **"Raw Aesthetic"** design language (all-monospace type, squared corners). The UI font is JetBrains Mono throughout.

The repo also contains a static landing/privacy site under `site/`, built with Astro and deployed to GitHub Pages.

## Tech Stack

**App (repo root)**

- **Expo SDK 55** with React Native 0.83, TypeScript
- **expo-router** (file-based routing in `app/`)
- **react-native-reanimated 4.x** (+ `react-native-worklets`) — all animations run on the UI thread via worklets
- **react-native-gesture-handler 2.x** — pan, tap, long-press gestures for the card stack
- **zustand** + AsyncStorage — state management with persistence
- **i18next / react-i18next** + `expo-localization` — app i18n (en, it, fr, es, de)
- **fuse.js** — fuzzy search over curated brand name index
- **JetBrains Mono** (`@expo-google-fonts/jetbrains-mono`) — the whole UI renders in this monospace family (Raw Aesthetic)
- **react-native-watch-connectivity** (patched) + **@bacons/apple-targets** — Apple Watch companion and its phone-side sync
- **react-native-android-widget** (Android widgets, JS-rendered) + a WidgetKit extension via **@bacons/apple-targets** (iOS) and the local **`modules/widget-bridge`** native module — home-screen widgets and their phone-side sync
- **expo-share-intent** + the local **`modules/barcode-vision`** native module — share-an-image-in flow with on-device barcode detection

Custom UI components throughout (no react-native-paper or third-party UI kits).

**Landing site (`site/`)**

- **Astro 6** + **Tailwind CSS 4**
- Astro i18n with en/it/fr/es/de; default locale (en) lives at `/`
- Deployed to GitHub Pages (custom domain `tesserone.com`) via `.github/workflows/deploy-site.yml` on pushes touching `site/**`

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
bun run dev     # local preview at http://localhost:4321/
bun run build   # static output to site/dist/
```

## Architecture

### Routing (`app/`)

File-based routing via expo-router:

- `index.tsx` — home screen with card wallet stack and FAB menu
- `add.tsx` — add card: orchestrates a guided 3-step wizard (barcode → brand → review), modal presentation
- `card/[id].tsx` — card detail/edit + single-card share-out (via `shareCard`), modal presentation
- `settings.tsx` — theme, language, import/export, about
- `_layout.tsx` — root Stack with ThemeProvider, ShareIntentProvider, GestureHandlerRootView, KeyboardProvider, SafeAreaProvider, ToastProvider, i18n bootstrap, JetBrains Mono font loading (`useFonts`), watch-sync startup (`startWatchSync`), and ErrorBoundary
- `+native-intent.tsx` — `redirectSystemPath` for the share extension's deep-link scheme

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
- `ui/BrandResults.tsx` — fuzzy-match result list for the brand picker
- `ui/Button.tsx`, `ui/Panel.tsx`, `ui/Sheet.tsx`, `ui/ActionBar.tsx` — Raw-Aesthetic primitives (squared corners from `theme/geometry.ts`)
- `ui/Toast.tsx` — `ToastProvider` + transient toast notifications
- `ui/Wordmark.tsx` — the Tesserone mono wordmark
- `tutorial/TutorialOverlay.tsx` — first-run overlay coaching the card-stack interactions
- `tutorial/useActiveTutorialStep.ts` — drives which step is visible based on app state

`ui/LogoSelector.tsx` and `ui/BrandResults.tsx` are used by the card edit screen (`card/[id].tsx`); the add flow uses the wizard's `StepBrand` (which reuses `LogoSelector` for its custom-logo fallback).

### Add-Card Wizard (`src/components/add/`)

`app/add.tsx` drives a guided 3-step wizard — a single modal with internal step state, a `WizardProgress` header, and a Back/Next/Save `ActionBar`. It replaced the old single-screen form to fix a discoverability problem where brand suggestions only appeared while typing in the name field. State (name/code/format/color/notes/logoSlug/customLogoUri) lives in `add.tsx`; the step components are presentational.

- `WizardProgress.tsx` — segmented progress bar + "STEP n OF 3" title/subtitle header
- `StepBarcode.tsx` — method chooser (scan / photo / type it), manual code + format entry, and the image-scan status banners; the live `CameraView` overlay is rendered by `add.tsx`
- `StepBrand.tsx` — first-class brand search with always-visible logo results (`searchBrands` / `getBrandLogo`) plus an explicit "not listed? custom name + logo" fallback
- `StepFinish.tsx` — live card preview (the real `CardFace` + `CardBack`), color grid, and notes before saving via `addCard`

The share-an-image-in flow still routes into Step 1 with the detected barcode pre-filled (see `+native-intent.tsx` and `_layout.tsx`).

### State (`src/stores/`)

- `cards.ts` — card CRUD, reorder, sort (manual/alphabetical/dateCreated), filter by name/logoSlug
- `settings.ts` — theme mode (system/light/dark), sort mode, language preference
- `tutorial.ts` — first-run tutorial progression state

### Services (`src/services/`)

- `logos.ts` — curated brand database (fuse.js search, bundled PNG logos, custom upload via expo-image-picker); also resolves logo URIs for the watch
- `scanner.ts` — barcode type mapping, validation, scan-artifact fixes
- `imageScan.ts` — `scanBarcodeFromImage`: detects a barcode in a still image via the local `modules/barcode-vision` native module (used by the share-in flow and gallery scan)
- `watch.ts` — Apple Watch sync: `startWatchSync` pushes a debounced `updateApplicationContext` snapshot + `startFileTransfer` for logos; `WATCH_SCHEMA_VERSION`/`WatchSnapshot` are the wire contract
- `importExport.ts` — JSON export/import (export via expo-sharing, import via expo-document-picker), tolerant import parsing (lowercase barcode enums migrated, missing fields defaulted), conflict resolution (keep existing/use imported/keep newer), and `shareCard` for single-card share-out

Camera and photo-library permissions are handled inline at the call site via `expo-camera` / `expo-image-picker`; there is no standalone permissions service.

### Internationalization (`src/i18n/`)

- `index.ts` — initializes i18next, resolves language from settings (with `system` falling back to device locale via `expo-localization`)
- `locales/{en,it,fr,es,de}.ts` — translation dictionaries
- `languages.ts` — supported-language metadata, default, system-locale resolver
- `format.ts` — locale-aware number/date formatting helpers

Components consume translations with `useTranslation()` from `react-i18next`.

### Theme (`src/theme/`)

- `colors.ts` — dark/light tokens, card color palette (including black/grey/white), `isLightColor()`, `textOnColor()`
- `fonts.ts` — JetBrains Mono `mono` family map (weight encoded by family name, not `fontWeight`, to avoid Android faux-bolding) + `fontAssets` for `useFonts`
- `typography.ts` — all-monospace type scale built on `mono` (card name 18pt, barcode 16pt, title 28pt, etc.)
- `geometry.ts` — single source of truth for Raw-Aesthetic corner radii: `CHROME_RADIUS` (4), `CARD_RADIUS` (2), `TILE_RADIUS` (2); everything squared off after the on-device A/B
- `index.ts` — ThemeProvider with dynamic accent color, `useTheme()` hook

### Apple Watch Companion (`ios/TesseroneWatch/`)

SwiftUI watch app scaffolded via `@bacons/apple-targets` (the target directory name MUST match the Xcode target name for the pods.rb integration). Phone side: `src/services/watch.ts`. Watch side renders cards from a synced `WatchSnapshot`.

- Sync: debounced `updateApplicationContext` for card data + eager file transfer for logo images
- Barcode coverage on watch: 7 formats rendered natively (EAN-13/EAN-8/UPC-A/CODE39/ITF-14/CODE128/QR; QR via `swift_qrcodejs`, 1D family hand-rolled); AZTEC/PDF417/UPC-E/DATAMATRIX fall back to an "Open on iPhone" placeholder
- Bundle ID: `com.chipcolate.tesserone.watchkitapp`

### Share Extension & Image Scan (`ios/ShareExtension/`, `modules/barcode-vision/`)

Share an image into Tesserone (or pick one from the gallery) and the barcode is detected on-device:

- `expo-share-intent` provides `ShareIntentProvider`/`useShareIntentContext` (wired in `_layout.tsx`); `app/+native-intent.tsx` redirects the share deep-link scheme
- `modules/barcode-vision/` — a local Expo native module (iOS + Android) exposing `detectBarcodesInImage`; consumed via `src/services/imageScan.ts`

### Home-Screen Widgets (`src/widgets/`, `modules/widget-bridge/`, `targets/TesseroneWidget/`)

Two widgets on each platform: **SingleCard** (one card, ~1×1) and **CardList** (a grid of cards, resizable). Both deep-link `tesserone://open/<id>` so a tap opens the app on that card. Each platform renders them differently:

- **iOS** — a native **WidgetKit** extension in `targets/TesseroneWidget/` (`SingleCardWidget.swift`, `CardListWidget.swift`, `TesseroneWidgetBundle.swift`), scaffolded via `@bacons/apple-targets`. It reads a snapshot the app writes into the **App Group `group.com.chipcolate.tesserone`**: `src/services/widgets.ts` `startWidgetSync` calls the local **`modules/widget-bridge`** native module (`WidgetBridgeModule.swift`) to write `widgets/snapshot.json` + logo PNGs, then `reloadWidgets()`. The widget renders empty unless the build has the App Group **entitlement** (so a `CODE_SIGNING_ALLOWED=NO` sim build won't work — see the `screenshots` skill).
- **Android** — **react-native-android-widget**, rendered from **JS in a headless task** (`src/widgets/widgetTaskHandler.tsx` → `render.tsx` → `CardWidgets.tsx`), not a native extension. `startWidgetSync` calls `requestWidgetUpdate`. Widget names/sizes are declared in `app.json`'s `react-native-android-widget` plugin block and must match the `SINGLE_CARD_WIDGET`/`CARD_LIST_WIDGET` constants in `src/widgets/config.ts`. Per-instance card selection lives in AsyncStorage under `widget:cfg:<widgetId>`, edited in `WidgetConfigurationScreen.tsx`.

Shared JS: `src/widgets/data.ts` (builds card data from the zustand store) and `src/widgets/i18n.ts` (`ensureWidgetI18n` — the headless task / config activity never mounts the app root, so it re-inits i18next from the persisted language). `startWidgetSync` runs from `app/_layout.tsx` once cards are loaded.

### Brand Logos (`data/brand-index.json` + `assets/logos/`)

Curated database of store logos (PNG). Each entry has: slug, name, aliases, alt text, primaryColor, secondaryColor, logo filename. Fuse.js fuzzy search for brand matching when adding cards.

To add a brand: drop PNG in `assets/logos/`, add `require()` in the `BUNDLED_LOGOS` map in `logos.ts`, add the entry to `brand-index.json`. The card renders the logo directly on `primaryColor` (no backing tile), so `primaryColor` must contrast the logo — run `bun run check:logos` to verify the preset is legible (it fails on hard-to-read pairs like a black logo on a black background).

### Landing Site (`site/`)

- `src/pages/index.astro`, `privacy.astro`, `[lang]/…` — routes
- `src/components/` — section components (Hero, FeatureList, Backstory, OSSection, StoreCTAs, Footer, ThemeToggle)
- `src/i18n/{en,it,fr,es,de}.ts` — per-language strings
- `astro.config.mjs` — `site: 'https://tesserone.com'`, i18n locales, default locale `en` has no URL prefix
- `public/CNAME` — custom-domain marker for GitHub Pages (must match `site` hostname)

### Screenshot Tooling (`scripts/`)

Store-listing **copy and assets are out of scope for this repo** — they live separately. What stays here is the automated screenshot pipeline. The shot list, target devices, and capture flow are documented in the **`screenshots` skill** (`.claude/skills/screenshots/SKILL.md`); the scripts are:

- `capture-ios.sh` / `capture-android.sh` — per-locale automated capture (idb+simctl / adb)
- `capture-ios-widget.sh` / `capture-android-widget.sh` — the home-screen widget shot (`06-widget`, EN-only); placement is a one-time manual GUI step, then these re-seed + capture (see the `screenshots` skill's "Widget shot")
- `seed-demo-data.mjs`, `inject-screenshot-state.mjs`, `android-seed-sql.mjs` — seed a deterministic demo wallet into AsyncStorage before capture
- `capture-screenshots.sh` — interactive manual fallback
- `render-icons.ts`, `tinify-logos.ts` — icon rendering and bundled-logo compression

## Key Design Decisions

- **Raw Aesthetic** — the entire UI renders in JetBrains Mono with squared corners and hairline borders (glassmorphism was tried and rejected); type lives in `theme/typography.ts`/`fonts.ts`, radii in `theme/geometry.ts`
- **Apple Wallet UX** — cards at fixed stack spacing (170px), scroll to browse, tap to expand+flip to barcode with mini-stack at bottom, tap or swipe up to dismiss
- **Springs for transitions, raw values for scroll** — scroll tracking is 1:1 with finger (no spring lag), state transitions (select/dismiss/reorder) use springs
- **Brightness boost on expand** — saves/restores device brightness automatically when the barcode appears
- **Reorder mode** — FAB menu toggle, iOS home screen wobble, long-press + drag
- **Wrist-first** — Apple Watch companion shows barcodes at the till without pulling out the phone; sync is one-way (phone → watch) via WatchConnectivity
- **Glanceable widgets** — home-screen widgets surface cards without opening the app; native WidgetKit on iOS (fed an App Group snapshot via `modules/widget-bridge`), JS-rendered via react-native-android-widget on Android
- **On-device barcode detection** — share/gallery image scans run through the local `barcode-vision` native module; no image leaves the device
- **Curated logos, not API** — bundled PNGs for offline-first, user upload for anything not in the set
- **Offline by default** — the app makes no network requests in normal use; nothing is sent off-device
- **Tolerant import format** — accepts exports with lowercase barcode enums or missing fields (normalized/defaulted on import)
