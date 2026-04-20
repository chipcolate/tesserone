# Tesserone

A loyalty card manager that feels alive. Cards aren't rows in a database — they're objects you hold, flip, and fan through. Built with wallet-style interactions, spring physics, and haptic feedback.

Local-first. Zero cloud. Zero bloat. Open source.

> Tesserone is an independent project. It is not affiliated with, endorsed by, or sponsored by any of the brands, merchants, or platform owners referenced in the app or its source. See [Trademarks & Attribution](#trademarks--attribution) for details.

## Features

- **Wallet-style card stack** — scroll, tap to expand, swipe up to dismiss
- **Card flip** — tap an expanded card to flip it and reveal the barcode
- **Brightness boost** — screen brightness maxes out when viewing a barcode, restores when you're done
- **Barcode scanning** — scan loyalty cards with the camera, or enter details manually
- **Brand recognition** — type a store name and Tesserone matches it to a curated brand database with logos and colors
- **Custom logos** — upload your own logo from the gallery or take a photo
- **Drag to reorder** — wobble mode with long-press drag, like rearranging your home screen
- **Import/Export** — back up your cards as JSON, import from a backup file with conflict resolution
- **Dark/Light/System themes** — neutral chrome, the cards bring the color
- **Haptic feedback** — tactile responses on every interaction
- **Fully offline** — all data stays on your device

## Supported Barcode Formats

EAN-13, EAN-8, Code 128, Code 39, QR, UPC-A, UPC-E, PDF417, Aztec, Data Matrix, ITF-14

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 55, React Native 0.83 |
| Animation | react-native-reanimated 4.x |
| Gestures | react-native-gesture-handler 2.x |
| Navigation | expo-router (file-based) |
| State | zustand + AsyncStorage |
| Barcode scan | expo-camera |
| Barcode render | @kichiyaki/react-native-barcode-generator, react-native-qrcode-svg |
| Haptics | expo-haptics |
| Brightness | expo-brightness |

## Getting Started

### Prerequisites

- macOS (for iOS builds)
- Xcode with iOS simulators and command line tools
- A physical iOS device (Expo Go is not supported)
- [Bun](https://bun.sh) package manager
- `eas-cli` installed globally
- Fastlane (`gem install fastlane`)

### Setup

```bash
# Clone and install
git clone https://github.com/chipcolate/tesserone.git
cd tesserone
bun install

# Build and run on a connected iPhone
npx expo run:ios --device
```

### Building for Distribution

```bash
# Ad-hoc build (for your provisioned devices)
eas build --platform ios --local --profile preview

# Install on device
xcrun devicectl device install app --device <DEVICE_UUID> <path-to-ipa>

# Production build (for App Store submission)
eas build --platform ios --local --profile production
```

## Adding Brand Logos

Tesserone ships with a curated set of store logos. To add a new brand:

1. Add a PNG logo to `assets/logos/` (white/light logo on transparent background works best)
2. Register the asset in `src/services/logos.ts` in the `BUNDLED_LOGOS` map
3. Add the brand entry to `data/brand-index.json` with name, aliases, colors, and logo filename

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

Import supports v1 (Cardshive) format — lowercase barcode formats are auto-migrated.

## License

Licensed under the [Apache License, Version 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for attribution and trademark information that must be preserved in redistributions.

## Trademarks & Attribution

Tesserone is an independent, open-source project. It is not affiliated with, endorsed by, or sponsored by any of the brands, merchants, or platform owners referenced in the app or its source.

- All third-party brand names, logos, and trademarks — including merchant logos bundled under `assets/logos/` and indexed in `data/brand-index.json`, as well as any platform, framework, or tool names mentioned for descriptive purposes — are the property of their respective owners. Any references are descriptive (nominative fair use) and do not imply endorsement, affiliation, or partnership.
- Bundled merchant logos are included solely to help users visually identify the merchant that issued a loyalty card.
- If you are a rights holder and would like a logo or brand entry removed from the bundled set, please open an issue on the repository.
- Custom logos uploaded by end users are the responsibility of the user; you must have the right to use any image you add to the app.

## Author

[Chipcolate](https://github.com/chipcolate)
