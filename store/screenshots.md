# Screenshots Shot List

Companion to `scripts/capture-screenshots.sh`. Use this as the navigation checklist while running the script.

## Devices

| Size | Apple device | Pixel dims |
|---|---|---|
| 6.9" (required) | iPhone 16 Pro Max | 1320 × 2868 |
| 6.5" (optional, legacy) | iPhone 14 Plus | 1284 × 2778 |

Apple only strictly requires 6.9" for new submissions. 6.5" is optional — skip if you're in a hurry.

## Locales

`en` · `it` · `fr` · `es` · `de`

## Running the capture flow

```bash
# On the Mac, with the simulator booted and Tesserone installed:
./scripts/capture-screenshots.sh 6.9 en
# Follow prompts; navigate on the simulator to each shot, press Enter to capture.
# Then change language (either in simulator Settings or inside the app) and run:
./scripts/capture-screenshots.sh 6.9 it
# …and so on.
```

Output lands in `screenshots/6.9-inch/<locale>/01-stack.png` etc. The folder is gitignored by default (add to `.gitignore` if not already — they're binary artifacts, no reason to commit).

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

### 03 — add
**Frame:** Add Card modal with the brand picker/LogoSelector visible. Type a partial brand name (e.g. `zara`, `bolla`, `ike`) so the fuzzy search shows a match with logo and color preview.
**Why:** acquisition — "easy to add, smart matching, no account."

**Captions:**
- EN · `Scan or type. We'll find the brand.`
- IT · `Scansiona o scrivi. Troviamo la tessera.`
- FR · `Scanne ou tape. On trouve la marque.`
- ES · `Escanea o escribe. Encontramos la marca.`
- DE · `Scannen oder tippen. Wir finden die Marke.`

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

## Preparing the simulator per language

**Option A — change system language (affects all apps):**
1. Simulator → Settings (the iOS Settings app inside the sim) → General → Language & Region
2. Change iPhone Language → pick target
3. Simulator restarts into that language (a few seconds)
4. Re-launch Tesserone

**Option B — change inside the app only (faster):**
1. In Tesserone: Settings → Language → pick target
2. App re-renders into the chosen language immediately

Either works; B is faster to iterate.

## Upload

Once captured, you can:
- Upload PNGs to App Store Connect manually (5 × 5 = 25 files for 6.9", add another 25 if doing 6.5")
- Or use `fastlane deliver` from the same Mac — it takes the `screenshots/` folder and uploads everything for you in one command

## Quick decision: captions or bare?

Apple accepts raw device screenshots (no captions). If you want designed screenshots with the captions above rendered onto the image, the path is:
- Import the PNGs into a Figma template with device frames + caption text boxes
- One template per device size; duplicate and swap copy per language
- Export at the native pixel dimensions (1320×2868 for 6.9", 1284×2778 for 6.5")

For a v1.0 submission, raw is fine. Designed screenshots pay off on update #2 when you iterate on the copy.
