<p align="center">
  <img src="assets/logo.png" alt="Tesserone logo" width="120" />
</p>

# Tesserone

A loyalty card manager that just works. Cards aren't rows in a database — they're objects you hold, flip, and fan through. Built with wallet-style interactions and haptic feedback.

Local-first. Zero cloud. Zero bloat. Open source.

> Tesserone is an independent project. It is not affiliated with, endorsed by, or sponsored by any of the brands, merchants, or platform owners referenced in the app or its source. See [Trademarks & Attribution](#trademarks--attribution) for details.

> Tesserone is a side project, maintained on a best-effort basis by the [Chipcolate](https://chipcolate.com) team. Issues and pull requests are welcome and will be reviewed as time allows.

## Features

- **Wallet-style card stack** — scroll, tap to bring a card forward with its barcode, tap again or swipe up to send it back
- **Apple Watch companion** — your barcodes on your wrist, scannable at the till without pulling out your phone
- **Home-screen widgets** — pin a single card or a grid of cards to your iOS or Android home screen; tap one to open straight to its barcode
- **Brightness boost** — screen brightness maxes out when viewing a barcode, restores when you're done
- **Guided add** — a quick 3-step flow (barcode → brand → review) to scan, snap, or type a card and preview it before saving
- **Barcode scanning** — scan loyalty cards with the camera, share in a screenshot, or enter details manually
- **Share a card** — send a single card to a friend straight from the card screen
- **Brand recognition** — search a curated brand database and Tesserone fills in the logo and colors
- **Custom logos** — upload your own logo from the gallery or take a photo
- **Drag to reorder** — wobble mode with long-press drag, like rearranging your home screen
- **Import/Export** — back up your cards as JSON, import from a backup file with conflict resolution
- **Monospace, squared-off design** — JetBrains Mono throughout, neutral chrome, the cards bring the color
- **Dark/Light/System themes**
- **Haptic feedback** — tactile responses on every interaction
- **Fully offline** — all data stays on your device, including on-device barcode detection

## Supported Barcode Formats

EAN-13, EAN-8, Code 128, Code 39, QR, UPC-A, UPC-E, PDF417, Aztec, Data Matrix, ITF-14

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 55, React Native 0.83 |
| Animation | react-native-reanimated 4.x (+ react-native-worklets) |
| Gestures | react-native-gesture-handler 2.x |
| Navigation | expo-router (file-based) |
| State | zustand + AsyncStorage |
| Typeface | JetBrains Mono (@expo-google-fonts/jetbrains-mono) |
| Barcode scan | expo-camera + a local `barcode-vision` native module (on-device image detection) |
| Barcode render | @kichiyaki/react-native-barcode-generator, react-native-qrcode-svg |
| Watch | react-native-watch-connectivity + @bacons/apple-targets (SwiftUI) |
| Widgets | react-native-android-widget (Android) + a WidgetKit extension via @bacons/apple-targets (iOS) |
| Share-in | expo-share-intent (iOS share extension) |
| Haptics | expo-haptics |
| Brightness | expo-brightness |

## Getting Started

### Prerequisites

**Common**

- [Bun](https://bun.sh) for package management (npm or yarn work too, but `bun.lock` is the checked-in lockfile)
- Node.js 20+ (needed for `npx` — some Expo CLI commands shell out to it)
- `eas-cli` installed globally

**For iOS builds**

- macOS (required — iOS builds don't run on Linux or Windows)
- Xcode with iOS simulators and command line tools
- A physical iOS device (Expo Go is not supported)

**For Android builds**

- Android Studio with the Android SDK and platform tools
- JDK 17
- A physical Android device with USB debugging enabled, or a running emulator
- `adb` on your PATH (comes with Android SDK platform-tools)

### Clone & Install

```bash
git clone https://github.com/chipcolate/tesserone.git
cd tesserone
bun install
```

### Run on a device

**iOS**

```bash
npx expo run:ios --device
```

**Android**

```bash
npx expo run:android --device
```

### Building for Distribution

**iOS**

```bash
# Ad-hoc build for your provisioned devices
eas build --platform ios --local --profile preview

# Install the resulting .ipa on a connected device
xcrun devicectl device install app --device <DEVICE_UUID> <path-to-ipa>

# Production build for App Store submission
eas build --platform ios --local --profile production
```

**Android**

```bash
# Preview APK for direct install / sharing with testers
eas build --platform android --local --profile preview

# Install the APK via adb
adb install <path-to-apk>

# Production Android App Bundle for Play Store submission
eas build --platform android --local --profile production
```

## Adding Brand Logos

Tesserone ships with a curated set of store logos. To add a new brand:

1. Add a PNG logo to `assets/logos/` (transparent background)
2. Register the asset in `src/services/logos.ts` in the `BUNDLED_LOGOS` map
3. Add the brand entry to `data/brand-index.json` with name, aliases, colors, and logo filename — `primaryColor` is the card background, so it must contrast the logo (the logo renders directly on it, with no backing tile)
4. Run `bun run check:logos` to verify the preset is legible — it fails on hard-to-read pairs like a black logo on a black background

Users can also upload custom logos from their photo gallery when adding a card.

## Data Format

Cards are stored locally via AsyncStorage and can be exported as JSON:

```json
{
  "cards": [
    {
      "id": "card-1234567890-abc123",
      "name": "Example Store",
      "code": "1234567890128",
      "format": "EAN13",
      "color": "#1456A2",
      "logoSlug": null,
      "notes": "Family card",
      "sortIndex": 0,
      "createdAt": "2026-04-13T10:00:00.000Z",
      "updatedAt": "2026-04-13T10:00:00.000Z"
    }
  ],
  "settings": { "themeMode": "system", "sortMode": "manual" },
  "exportedAt": "2026-04-13T12:00:00.000Z",
  "version": "2.0.0"
}
```

Import is tolerant of older export shapes — lowercase barcode enums are normalized and missing fields get sensible defaults.

## License

Licensed under the [Apache License, Version 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for attribution and trademark information that must be preserved in redistributions.

## Trademarks & Attribution

Tesserone is an independent, open-source project. It is not affiliated with, endorsed by, or sponsored by any of the brands, merchants, or platform owners referenced in the app or its source.

- All third-party brand names, logos, and trademarks — including merchant logos bundled under `assets/logos/` and indexed in `data/brand-index.json`, as well as any platform, framework, or tool names mentioned for descriptive purposes — are the property of their respective owners. Any references are descriptive (nominative fair use) and do not imply endorsement, affiliation, or partnership.
- Bundled merchant logos are included solely to help users visually identify the merchant that issued a loyalty card.
- If you are a rights holder and would like a logo or brand entry removed from the bundled set, please open an issue on the repository.
- Custom logos uploaded by end users are the responsibility of the user; you must have the right to use any image you add to the app.

## Author

[Chipcolate](https://chipcolate.com)
