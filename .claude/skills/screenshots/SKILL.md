---
name: screenshots
description: Capture App Store / Play Store screenshots for Tesserone across all supported locales (en/it/fr/es/de) using the automated capture scripts. Use when asked to capture, regenerate, or update the store/marketing screenshots, or to seed the demo wallet for shots.
---

# Screenshots Shot List

The capture is fully automated (no manual navigation). Two scripts seed a
deterministic demo wallet into AsyncStorage and drive the app per locale:

- `scripts/capture-ios.sh` — iOS 6.9" via idb + simctl
- `scripts/capture-android.sh` — Android phone via adb

The interactive `scripts/capture-screenshots.sh` is kept as a manual fallback.

## Devices

| Platform | Device | Pixel dims | Notes |
|---|---|---|---|
| iOS 6.9" (required) | iPhone 16 Pro Max sim | 1320 × 2868 | Apple's required size |
| iOS 6.5" (optional) | iPhone 14 Plus sim | 1284 × 2778 | legacy, skippable |
| Android phone | Medium_Phone AVD @ `wm size 1080x2160` | 1080 × 2160 | 2:1 — Play caps aspect at 2:1 |

Theme: **light**. Locales: `en` · `it` · `fr` · `es` · `de`.

## Demo data

`scripts/seed-demo-data.mjs` builds a 6-card brand-colored wallet (Conad,
Esselunga, IKEA, Decathlon, Media World, Mango) with valid barcodes, plus
settings (theme/locale) and a disabled first-run tutorial. The values are the
exact strings zustand's persist middleware writes to AsyncStorage.

- iOS: `scripts/inject-screenshot-state.mjs` writes the RCTAsyncLocalStorage_V1
  manifest (+ md5 side file for the large `cards` value) in the sim container.
- Android: `scripts/android-seed-sql.mjs` emits SQL for the RKStorage SQLite DB
  (`catalystLocalStorage` table), injected via `run-as` (needs a debuggable build).

## Running the capture flow

### iOS

```bash
# Boot iPhone 16 Pro Max sim, install a Release build (clean, no Metro/dev UI):
xcrun simctl boot "iPhone 16 Pro Max"; open -a Simulator
npx expo run:ios --configuration Release
# Needs idb: brew install facebook/fb/idb-companion && pip3 install fb-idb
THEME=light ./scripts/capture-ios.sh        # -> screenshots/6.9-inch/<locale>/
```

### Android

```bash
# Boot the AVD, then install a *debuggable Release* build so run-as can seed
# AsyncStorage AND there is no Metro dependency / dev-tools FAB. Temporarily add
# `debuggable true` to the release buildType in android/app/build.gradle
# (android/ is gitignored prebuild output), then:
npx expo run:android --variant release
# Launch once to create the DB, then pull the base:
adb exec-out run-as com.chipcolate.tesserone cat databases/RKStorage > /tmp/tess-android/RKStorage.base.db
THEME=light ./scripts/capture-android.sh    # -> screenshots/android-phone/<locale>/
# Revert the debuggable change afterwards.
```

Output is gitignored (binary artifacts). Zips for upload: `screenshots/6.9-inch.zip`,
`screenshots/android-phone.zip` (rebuild with `zip -rq`).

### How the automation reaches each shot

- **01 stack / 02 expanded** — launch; tap the 2nd card (Esselunga) to flip to
  its barcode. The tap can race the stack entrance animation; the scripts verify
  the expanded card (barcode code `ES4471…`) and retry.
- **03a method / 03b brand** — deep link `tesserone://add` lands on the add-card
  wizard's Step 1 (the scan / photo / type-it method chooser) → that's **03a**.
  For **03b**, the script drives one step forward: it opens "type it in", types a
  valid barcode (`8004620150741`), advances to Step 2, then types `Deca` to
  surface the brand fuzzy-match with logos. The wizard's button labels are
  localized, so those in-app taps are located by position in the view tree — idb
  `describe-all` on iOS, `uiautomator dump` on Android — not by label.
- **04 detail / 05 settings** — deep links `tesserone://card/demo-decathlon`,
  `tesserone://settings`. On iOS the "Open in Tesserone?" system prompt is
  detected via idb and dismissed; Android launches the scheme directly.

## Shots

### 01 — stack
**Frame:** Home screen with 4–6 colorful cards in the stack, scrolled so the stack is visible (not all collapsed at the top). Pick cards with strong brand colors (a few reds, blues, greens) to showcase the palette.
**Why this shot:** identity — "lots of cards, one familiar place."

**Captions (if you composite later):**
- EN · `All your cards. One tap away.`
- IT · `Tutte le tue tessere. A un tocco.`
- FR · `Toutes tes cartes. Un geste.`
- ES · `Todas tus tarjetas. A un toque.`
- DE · `Alle deine Karten. Ein Tipp.`

### 02 — expanded
**Frame:** A card tapped open — full-screen, flipped to the barcode side, with the mini-stack visible at the bottom. Pick a card with a recognizable barcode format (EAN-13 or QR).
**Why:** the core "at checkout" UX — flip, scan, done.

**Captions:**
- EN · `Flip for the barcode. Brightness on, auto.`
- IT · `Gira sul codice. Luminosità al massimo, da sola.`
- FR · `Retourne pour le code. Luminosité au max, toute seule.`
- ES · `Gira al código. Brillo al máximo, solo.`
- DE · `Umdrehen für den Barcode. Helligkeit automatisch max.`

### 03a — add (method chooser)
**Frame:** Step 1 of the add-card wizard — the `STEP 1 OF 3` header over the scan / photo / type-it method tiles. No keyboard.
**Why:** acquisition — "adding a card is a quick, guided flow."

**Captions:**
- EN · `Scan, snap, or type. Three ways in.`
- IT · `Scansiona, fotografa o scrivi.`
- FR · `Scanne, photographie ou tape.`
- ES · `Escanea, fotografía o escribe.`
- DE · `Scannen, fotografieren oder tippen.`

### 03b — add (brand search)
**Frame:** Step 2 of the wizard — the always-visible brand search with `Deca` typed, showing the Decathlon fuzzy-match result with its logo and color. Keyboard up (live search).
**Why:** acquisition — "smart matching, no account."

**Captions:**
- EN · `Type a name. We'll find the brand.`
- IT · `Scrivi un nome. Troviamo la tessera.`
- FR · `Tape un nom. On trouve la marque.`
- ES · `Escribe un nombre. Encontramos la marca.`
- DE · `Tippe einen Namen. Wir finden die Marke.`

### 04 — detail
**Frame:** Card detail/edit screen with a populated card — name, barcode, notes, color swatch. Pick a distinctive color to make it visually pop.
**Why:** ownership — "make it yours."

**Captions:**
- EN · `Your card. Your colours. Your notes.`
- IT · `Tua tessera. Tuoi colori. Tue note.`
- FR · `Ta carte. Tes couleurs. Tes notes.`
- ES · `Tu tarjeta. Tus colores. Tus notas.`
- DE · `Deine Karte. Deine Farben. Deine Notizen.`

### 05 — settings
**Frame:** Settings screen showing language selector, theme toggle, and Export/Import buttons. Bonus: scroll so the "About / open source" section is visible too.
**Why:** privacy + portability — "your data stays yours."

**Captions:**
- EN · `Zero cloud. Export anytime.`
- IT · `Zero cloud. Esporti quando vuoi.`
- FR · `Zéro cloud. Export quand tu veux.`
- ES · `Cero nube. Exporta cuando quieras.`
- DE · `Null Cloud. Jederzeit exportieren.`

## Per-language handling

The capture scripts set the locale by seeding `settings.language` directly, so
there is no need to change the simulator/emulator system language — the app
boots into the seeded locale.

## Upload

Once captured:
- App Store Connect: upload `screenshots/6.9-inch/<locale>/*.png` (6 × 5 = 30 for 6.9")
- Play Console: upload `screenshots/android-phone/<locale>/*.png` (6 × 5 = 30)
- Or use `fastlane deliver` (iOS) / `fastlane supply` (Android) against the folders

## Quick decision: captions or bare?

Apple accepts raw device screenshots (no captions). If you want designed screenshots with the captions above rendered onto the image, the path is:
- Import the PNGs into a Figma template with device frames + caption text boxes
- One template per device size; duplicate and swap copy per language
- Export at the native pixel dimensions (1320×2868 for 6.9", 1284×2778 for 6.5")

For a v1.0 submission, raw is fine. Designed screenshots pay off on update #2 when you iterate on the copy.
