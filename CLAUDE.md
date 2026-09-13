# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesserone is a loyalty card manager with an Apple Wallet-style card stack. Local-first, zero cloud, open source (Apache 2.0). Bundle ID: `com.chipcolate.tesserone`. Team ID: `HNF5BY9XXV`. App Group: `group.com.chipcolate.tesserone`. URL scheme: `tesserone`.

It ships with an **Apple Watch companion** (wrist barcodes), a **Wear OS companion**, **home-screen widgets** (iOS WidgetKit + Android Glance — tap a card to open its barcode), a **share-an-image-in** flow (on-device barcode detection), and the **"Raw Aesthetic"** (JetBrains Mono throughout, squared corners).

The repo is a **monorepo**: independent native iOS and Android apps (no KMP / no shared runtime), plus the Astro landing site under `site/`.

**Expo 1.4 still lives at the repo root** (`app/`, `src/`, `modules/`, `targets/`) for store hotfixes until 2.0.0 cutover. New product work goes in `apps/` + `shared/`. Do not delete the Expo tree until the native binaries replace the listings.

Draft PR: https://github.com/chipcolate/tesserone/pull/65 (`feat/native-rewrite`).

## Layout

```
apps/ios/          SwiftUI/UIKit phone + Watch + WidgetKit + Share Extension
apps/android/      Kotlin/Compose :app + :core + :wear
shared/            brands, i18n JSON, tokens, motion, fonts, wallet/export schema
site/              Astro landing (en/it/fr/es/de) → GitHub Pages / tesserone.com
app/, src/, …      Expo 1.4 (hotfix-only until cutover)
```

There is **no shared business-logic runtime**. Each native app reimplements CRUD, scan, and UI against the files in `shared/`.

## Tech Stack

**iOS (`apps/ios/`)** — iOS 17+, watchOS 10, iPhone only

- Swift 5.9, SwiftUI chrome, **UIKit `CardStackView`** for 1:1 stack scroll
- Local SPM package `TesseroneKit` (models, JSON store, Expo migrator, barcodes, i18n, import/export)
- WatchConnectivity + WidgetKit + Share Extension, all on App Group `group.com.chipcolate.tesserone`
- Scan: VisionKit `DataScannerViewController` / AVFoundation + Vision; still images via `ImageBarcodeDetector`
- Barcodes: hand-rolled 1D (from the old watch encoders) + Core Image 2D on iPhone; watch QR is a vendored Nayuki encoder (no CocoaPods)
- Fonts: `shared/fonts` JetBrains Mono registered by PostScript name — **never** `fontWeight` on a single family
- `Tesserone.xcodeproj` is checked in (Xcode 16+). `project.yml` is optional XcodeGen; not required to build

**Android (`apps/android/`)** — minSdk 26, Wear minSdk 30, compile/target 35

- Kotlin, Jetpack Compose (Material 3 as host only — chrome is Raw Aesthetic)
- Gradle modules: `:core` (store, migrator, brands, ZXing, i18n), `:app` (phone + Glance), `:wear` (Wear Compose companion)
- Scan: CameraX + ML Kit barcode; still images via `:core` `ImageBarcodeDetector`
- Wear Data Layer (`WatchSnapshot` v1, same JSON as iOS WatchConnectivity)
- Fonts copied from `shared/fonts` into `res/font` at build time (one file per weight)

**Shared (`shared/`)**

| Path | What |
|---|---|
| `brands/` | `brand-index.json` + logo PNGs |
| `i18n/` | en/it/fr/es/de JSON (`{{name}}` interpolation, `_one`/`_other` plurals) |
| `tokens/` | colors, geometry (chrome 4 / card 2 / tile 2), type scale |
| `motion/` | card-stack spacing and spring constants |
| `fonts/` | JetBrains Mono OFL (Regular/Medium/Bold/ExtraBold) |
| `schema/` | native wallet JSON, export JSON, AsyncStorage migration fixtures |

**Landing site (`site/`)** — Astro 6 + Tailwind 4, i18n en/it/fr/es/de, GitHub Pages (`deploy-site.yml`).

**Expo 1.4 (root, hotfix-only)** — Expo SDK 55, RN 0.83, expo-router, Reanimated, zustand+AsyncStorage. Do not add features here.

## Build & Run

Native Linux box is the cockpit. **iOS / watchOS / Android sim builds run on burago-node-1** (`ssh burago`, Tailscale `100.118.161.68`). See the `burago-node` skill.

```bash
# rsync working tree (do NOT --exclude apps/ios or apps/android)
rsync -az --delete --exclude .git --exclude /node_modules --exclude /site/node_modules \
  --exclude /apps/android/.gradle --exclude /apps/android/app/build \
  --exclude /apps/android/core/build --exclude /apps/android/wear/build \
  --exclude /apps/android/build --exclude /apps/android/local.properties \
  -e ssh ./ burago:builds/tesserone/
```

`xcodebuild` and Gradle **exit**. `expo run:*` hangs on Metro — do not wait on it.

Sequence platforms on burago (24 GB, llama-server resident). Wear AVD is **not** installed; compile `:wear` only unless asked to download a Wear image. Simulator ad-hoc sign with `CODE_SIGN_IDENTITY=-` (not `CODE_SIGNING_ALLOWED=NO`, or App Groups are empty). The sim name is **`burago-iphone`**, not “iPhone 16 Plus”.

```bash
# iOS (on burago)
cd ~/builds/tesserone/apps/ios
xcodebuild -project Tesserone.xcodeproj -scheme Tesserone \
  -destination 'platform=iOS Simulator,id=<burago-iphone UDID>' \
  -configuration Debug build CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=""
cd TesseroneKit && swift test

# Android (Linux or burago)
cd apps/android
./gradlew :core:test :app:assembleDebug :wear:assembleDebug
```

Physical iPhone install needs a **development cert on the build Mac**. burago currently has 0 signing identities; device installs belong on a signed-in Mac (the MacBook). USB can show an iPhone while CoreDevice still reports `pairingState: unsupported` until Developer Mode + DDI prepare succeed.

### Landing site

```bash
cd site
bun install
bun run dev     # http://localhost:4321/
bun run build   # site/dist/
```

### Expo 1.4 hotfix (until cutover)

```bash
bun install
npx expo run:ios --device
eas build --platform ios --local --profile production
```

## Architecture

### Persistence

Native store is **not** AsyncStorage. Canonical document (`shared/schema/wallet.schema.json`):

```
{ schemaVersion: 1, cards: { id: FidelityCard }, settings, tutorial, migratedFromExpo }
```

- **iOS** — App Group `store/wallet.json` + `store/custom-logos/`. Widget, Share, and the app share one file.
- **Android** — `filesDir/store/wallet.json` + `filesDir/custom-logos/`.

`customLogoUri` is a **bare filename**. Export JSON is version `2.1.0` (data-URI custom logos). Import still accepts lowercase barcode enums.

**One-shot Expo migrator** (empty native store only): unwrap zustand `{state, version}` for keys `cards` / `settings` / `tutorial`. iOS: `Library/Application Support/com.chipcolate.tesserone/RCTAsyncLocalStorage_V1` (values >1024 chars are md5 sidecars). Android: SQLite `RKStorage` / `catalystLocalStorage`. Fixtures: `shared/schema/fixtures/`. Leave AsyncStorage in place after migrate.

### iOS app (`apps/ios/`)

| Target | Bundle ID |
|---|---|
| Tesserone | `com.chipcolate.tesserone` |
| TesseroneWatch | `com.chipcolate.tesserone.watchkitapp` |
| TesseroneWidget | `com.chipcolate.tesserone.widget` (kinds `TesseroneSingleCard`, `TesseroneCardList`) |
| TesseroneShare | `com.chipcolate.tesserone.share` |

- `Tesserone/Wallet/CardStackView.swift` — UIKit pan, 1:1 scroll, rubber-band 0.18, springs from `shared/motion/card-stack.json`
- `Tesserone/Add/` — 3-step wizard (barcode → brand → review)
- `Tesserone/Card/EditCardView.swift`, `Settings/SettingsView.swift`, `Tutorial/`
- `Tesserone/Sync/WatchSync.swift` — `WCSession` `updateApplicationContext` + `transferFile` (`WATCH_SCHEMA_VERSION = 1`)
- `Tesserone/Sync/WidgetSync.swift` — App Group `widgets/snapshot.json` + logos, `WidgetCenter.reloadAllTimelines()`
- Share Extension: one image → Vision → `store/pending-scan.json` → `tesserone://add`

Deep links: `tesserone://open/<id>` (expand+flip), `tesserone://add`.

### Android app (`apps/android/`)

- `:core` — `WalletStore`, `ExpoMigrator`, `BrandIndex`, `BarcodeEncoder` (ZXing), `I18n`, `WatchSnapshot`
- `:app` — Compose home/stack/wizard/edit/settings/tutorial; Glance **SingleCard** / **CardList**; `WearSync`
- `:wear` — Wear Compose list + barcode. `applicationId` is **`com.chipcolate.tesserone`** (same as phone) so Data Layer syncs; namespace `com.chipcolate.tesserone.wear`

**Android RN widgets are dropped on update** (provider class names changed). Users re-add from the picker. iOS WidgetKit kinds are preserved so placed widgets survive.

Brand logos/index are **copied at Gradle build** from `shared/brands` into `:core` assets (not checked in under `core/src/main/assets`).

### Card stack motion

Constants live in `shared/motion/card-stack.json` (stackSpacing 170, cardHeight 280, miniPeek 45, expandedTop 20, rubberBand 0.18, flip 300ms cubic-out). Scroll is raw 1:1; select/dismiss/reorder use interpolating springs (mass=1, RN damping/stiffness). Tap expand auto-flips and maxes brightness; tap or swipe up dismisses; long-press expanded → edit.

### i18n

`shared/i18n/{en,it,fr,es,de}.json` is canonical. Nested keys, `{{name}}` / `{{count}}` / `{{format}}`, `_one`/`_other` for plurals. `system` language → device locale if it is one of the five, else `en`. Expo re-exports the JSON from `src/i18n/locales/*.ts` so the index has one owner.

### Brand logos

`shared/brands/brand-index.json` + `shared/brands/logos/*.png`. Fields: slug, name, aliases, alt, primaryColor, secondaryColor, logo. `primaryColor` is the card background (logo sits on it, no tile) — `bun run check:logos` fails unreadable pairs.

To add a brand:

1. PNG in `shared/brands/logos/` (transparent background)
2. Entry in `brand-index.json`
3. **Until Expo cutover**, also `require()` it in `src/services/logos.ts` `BUNDLED_LOGOS`
4. `bun run check:logos`

Native apps pick up new logos from the synchronized group / Gradle copy. No per-platform asset catalog entry.

## Expo 1.4 (hotfix map)

Keep this working until cutover. Do not add features.

- Routes: `app/index.tsx`, `add.tsx`, `card/[id].tsx`, `settings.tsx`
- Stack: `src/components/wallet/`
- Stores: `src/stores/{cards,settings,tutorial}.ts` (zustand + AsyncStorage)
- Watch/widgets/share: `src/services/watch.ts`, `src/widgets/`, `modules/widget-bridge`, `targets/TesseroneWatch`, `targets/TesseroneWidget`, `expo-share-intent`

Screenshot scripts (`scripts/inject-screenshot-state.mjs`, `android-seed-sql.mjs`) still seed **Expo AsyncStorage**, not native `wallet.json`.

## Landing Site (`site/`)

- `src/pages/index.astro`, `privacy.astro`, `[lang]/…`
- `src/i18n/{en,it,fr,es,de}.ts`
- `astro.config.mjs` — `site: 'https://tesserone.com'`, default locale `en` has no URL prefix
- `public/CNAME` must match the `site` hostname

## Key Design Decisions

- **Native, not cross-platform** — SwiftUI/UIKit and Compose independently; share JSON/assets only
- **Raw Aesthetic** — JetBrains Mono, squared radii (chrome 4, card/tile 2), hairline borders; weight is a font file, not `fontWeight`
- **Apple Wallet UX** — 170px stack spacing, tap to expand+flip, mini-stack at bottom
- **Springs for transitions, raw values for scroll** — no spring lag on the finger
- **Brightness boost on expand** — iOS save/restore `UIScreen.brightness`; Android window override, restore system/adaptive
- **Wrist-first** — Watch + Wear, one-way phone → wearable
- **Glanceable widgets** — WidgetKit (App Group snapshot) and Glance; tap `tesserone://open/<id>`
- **On-device barcode detection** — Vision / ML Kit; no image leaves the device
- **Curated logos, not API** — bundled PNGs; user upload for anything else
- **Offline by default** — no network in normal use
- **Tolerant import** — lowercase barcode enums and missing fields normalized on import
- **Same store listings** — 2.0.0 replaces 1.4.x in place; migrate wallets; then delete Expo
