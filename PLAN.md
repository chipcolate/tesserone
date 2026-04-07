# Tesserone — Architecture Plan

## Vision

A loyalty card manager that feels *alive*. Cards aren't rows in a database — they're objects you hold, flip, fan through. The interaction model is Apple Wallet: cards stacked, peekable, pullable, with spring physics and haptic feedback making them feel physical. Local-first, zero cloud, zero bloat. The anti-Klarna. Open source from day one.

**Bundle ID:** `com.chipcolate.tesserone`
**Repository:** Public on GitHub from the start.

---

## The Apple Wallet Interaction

Before choosing tech, let's be precise about what we're replicating (and where we diverge):

**What Apple Wallet does:**
- Cards stacked vertically, each showing its top ~60px edge
- Scroll the stack to fan cards apart (each card's Y position interpolates from the scroll offset)
- Tap a card to expand it — the tapped card slides up to fill the screen, cards above it move up and off-screen, cards below it move down and off-screen
- The expanded card shows full detail; swipe down to collapse back into the stack
- Spring physics on all transitions — nothing snaps, everything settles
- Subtle parallax/depth: cards have a slight shadow and scale difference suggesting z-depth

**What Apple Wallet is NOT:**
- It's not 3D. There are no meshes, no WebGL, no scene graph. It's 2D views with `transform: [{ translateY }, { scale }]` driven by scroll position and gesture state.
- The "depth" is faked with shadows and scale (cards further back are slightly smaller).

**Where Tesserone diverges:**
- **Card flip.** Apple Wallet doesn't flip cards. We do — tap a card to flip it and show the barcode on the back. This is a `rotateY` transform with a front/back face swap at the midpoint.
- **Long-press for full-screen barcode.** Not in Apple Wallet. We add a dedicated "use this card at checkout" mode with brightness boost.
- **Dynamic accent color.** The top card's color tints the UI chrome. Apple Wallet doesn't do this.
- **Inline search.** Search is always accessible in the stack — type to filter cards in place, no separate search view.
- **Store logos on card faces.** Cards show the store's brand logo (from a bundled icon set), not just a name string.
- **Reorder + sort.** Long-press drag to reorder cards manually, plus quick-sort shortcuts (alphabetical, date created).

---

## Animation Stack

**Reanimated 4 + Gesture Handler 2.** That's it.

- Cards are `<Animated.View>` with transforms driven by `useSharedValue`
- Animations run on the native UI thread via worklets — 60fps, zero JS bridge overhead
- Gesture Handler integrates directly with Reanimated (no indirection)
- `withSpring()` for everything, `withTiming()` only for opacity fades
- Card flip is `rotateY` with `backfaceVisibility: 'hidden'` on front/back children
- Shadows via platform APIs (`shadowColor`/`shadowOffset` on iOS, `elevation` on Android)
- If card visuals need extra polish later (GPU gradients, soft blur shadows), `@shopify/react-native-skia` can be layered on top of individual card faces without changing the interaction layer

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK 55, React Native 0.83 | Matches legacy, modern tooling |
| Animation | `react-native-reanimated` 4.x | UI thread animations, spring physics, worklets |
| Gestures | `react-native-gesture-handler` 2.x | Pan, tap, long-press — drives card stack directly |
| Navigation | `expo-router` (file-based) | Cleaner than React Navigation stack, deep linking for free |
| State | `zustand` + AsyncStorage middleware | Proven pattern from v1, lightweight |
| UI Components | Custom (no Paper) | Full visual control, no MD3 constraints |
| Barcode scan | `expo-camera` | Same as v1, solid |
| Barcode render | `@kichiyaki/react-native-barcode-generator` + `react-native-qrcode-svg` | Same as v1 |
| Haptics | `expo-haptics` | Tactile feedback on card interactions |
| Brightness | `expo-brightness` | Full-screen barcode mode |
| File I/O | `expo-file-system`, `expo-document-picker`, `expo-sharing` | Import/export |
| UI Icons | `lucide-react-native` | Cleaner than vector-icons, tree-shakeable |
| Store logos | Simple Icons (3,400+ brands, CC0) | Bundled SVGs, offline, searchable. Fallback: store name initial |
| Logo search | `fuse.js` | Lightweight fuzzy search over brand name index |
| SVG rendering | `react-native-svg` | Render bundled brand SVGs on card faces |
| Visual polish (later) | `@shopify/react-native-skia` | GPU card face rendering — optional enhancement |

**Dropped from v1:** `react-native-paper` (generic MD3 look), `react-native-vector-icons` (replaced by lucide).

---

## Store Logo System

Cards show store brand logos on their face. This is a core part of the visual identity — a card for "Esselunga" should look like an Esselunga card, not a colored rectangle with text.

### Source: Simple Icons

Simple Icons (simpleicons.org) provides 3,400+ brand SVGs under CC0 (public domain). No attribution required, fully compatible with open-source distribution.

**Why Simple Icons over alternatives:**
- **Offline-first.** Logos are bundled as SVGs, not fetched from an API. No internet needed, ever.
- **CC0 license.** No legal friction for an open-source project.
- **3,400+ brands.** Covers most major retail chains, supermarkets, gas stations, pharmacies, airlines, etc.
- **Consistent quality.** Monochrome SVGs at a standardized size. We tint them to match the card's color scheme.
- **Tree-shakeable.** We don't bundle all 3,400 icons. We build a metadata index (name → slug mapping) and lazy-load SVGs on demand.

**Alternatives considered and rejected:**
- **Logo.dev / Brandfetch APIs** — require internet, not local-first
- **Clearbit** — shut down December 2025
- **theSVG** — larger set (5,650+) but less battle-tested, licensing less clear

### How It Works

1. **Metadata index:** A JSON file mapping brand names and aliases to Simple Icons slugs. Generated at build time from the Simple Icons dataset. Includes category tags (grocery, fuel, pharmacy, etc.) for filtering.

2. **Fuzzy search:** When adding a card, the user types the store name. `fuse.js` searches the metadata index with typo tolerance. Results show as a scrollable list with the brand icon, name, and category.

3. **Selection flow:** User picks a brand from search results → the card gets `logoSlug: "esselunga"` stored. If no match is found, the card has no `logoSlug` and falls back to displaying the first letter(s) of the card name as a large typographic element.

4. **Rendering:** On the card face, `react-native-svg` renders the brand SVG in its **original brand color** (not tinted). This maximizes recognizability — users should see the logo they know from the physical store. The card background color provides contrast.

5. **Logo color extraction:** Simple Icons ships brand hex colors in its metadata (the `hex` field per icon). When a user selects a brand logo, we use that hex as the basis for the card's background color. The logic: derive a palette from the brand color — use a desaturated/lightened or darkened variant as the card background so the original-color logo pops against it. This happens automatically on logo selection; the user can override with the color picker.

6. **Bundle strategy:** SVGs are small (~1-3KB each). Even bundling all 3,400 is roughly 5-10MB — acceptable for a mobile app. We can also ship a "common brands" subset (~500 most popular retail/loyalty brands) in the main bundle and download the full set as an optional asset pack on first launch.

### Fallback

When no logo is matched: the card face shows the store name rendered large, with the first letter as a prominent initial (think iOS Contacts style). This still looks good — the color + typography carry the design.

---

## App Structure

```
tesserone/
├── app/                          # expo-router file-based routing
│   ├── _layout.tsx               # Root layout (GestureHandlerRoot, theme, safe area)
│   ├── index.tsx                 # Home screen (card wallet)
│   ├── add.tsx                   # Add card (scan + manual)
│   ├── card/
│   │   └── [id].tsx              # Card detail/edit
│   └── settings.tsx              # Settings
├── src/
│   ├── components/
│   │   ├── wallet/               # The card stack interaction
│   │   │   ├── CardStack.tsx     # Orchestrator: positions cards, handles scroll-fan
│   │   │   ├── CardItem.tsx      # Single card in the stack (Animated.View)
│   │   │   ├── CardFace.tsx      # Front face rendering (color + logo/name)
│   │   │   ├── CardBack.tsx      # Back face rendering (barcode)
│   │   │   ├── CardFlip.tsx      # Flip wrapper (rotateY, backface visibility)
│   │   │   └── useCardStack.ts   # Hook: shared values, gesture handlers, spring configs
│   │   ├── ui/
│   │   │   ├── BarcodeModal.tsx  # Full-screen barcode with brightness boost
│   │   │   ├── ColorPicker.tsx   # Improved: larger swatches, grouped by hue
│   │   │   ├── FormatPicker.tsx  # Horizontal scroll chips
│   │   │   ├── LogoPicker.tsx    # Brand logo search + selection (fuse.js powered)
│   │   │   ├── SearchBar.tsx     # Inline search input for filtering the stack
│   │   │   ├── SortMenu.tsx      # Sort options: manual, alphabetical, date created
│   │   │   ├── ScannerView.tsx   # Camera with scan region overlay
│   │   │   ├── Button.tsx        # Custom pressable
│   │   │   ├── Input.tsx         # Custom text input
│   │   │   └── EmptyState.tsx    # First-run CTA
│   │   └── shared/
│   │       ├── Header.tsx        # Translucent top bar
│   │       └── BottomBar.tsx     # Search pill + add button + sort
│   ├── stores/
│   │   ├── cards.ts              # Card CRUD + ordering
│   │   └── settings.ts           # Theme prefs + sort preference
│   ├── services/
│   │   ├── scanner.ts            # Barcode validation & format mapping
│   │   ├── logos.ts              # Logo index loading, fuse.js search, SVG resolution
│   │   ├── importExport.ts       # JSON import/export with merge strategies
│   │   └── permissions.ts        # Camera permission flow
│   ├── theme/
│   │   ├── colors.ts             # Light/dark tokens, dynamic accent
│   │   ├── typography.ts         # Font scales
│   │   └── index.ts              # ThemeProvider + useTheme hook
│   └── types.ts                  # FidelityCard, BarcodeFormat, etc.
├── data/
│   └── brand-index.json          # Generated: name/alias → Simple Icons slug mapping
├── assets/
│   ├── fonts/                    # (system fonts — may not need this)
│   └── images/                   # App icon, splash
├── app.json
├── package.json
└── tsconfig.json
```

The wallet components are pure React Native views. No metro.config.js hacking, no texture generation, no canvas setup.

---

## The Card Stack — Interaction Design

### How Apple Wallet Works (and how we replicate it)

The stack is a vertical list of `<Animated.View>` cards, each absolutely positioned. Their `translateY` is driven by a combination of:

1. **Base position** — each card has a "collapsed" Y based on its index (card 0 at top, card 1 at top + peek height, card 2 at top + 2 × peek height, etc.)
2. **Scroll offset** — a `PanGesture` (or `ScrollView` `onScroll`) fans the cards apart. As you scroll, each card's Y interpolates from "collapsed" to "expanded" spacing.
3. **Selection state** — when a card is tapped, it animates to fill the screen (`translateY → 0, scale → 1`). Cards above animate up and off-screen, cards below animate down and off-screen.

```
COLLAPSED (idle)          FANNED (scrolling)        SELECTED (card 2 tapped)
┌─────────────────┐      ┌─────────────────┐       ┌─────────────────┐
│ ▔▔▔ Card 0 ▔▔▔  │      │                 │       │                 │
│ ▔▔▔ Card 1 ▔▔▔  │      │  ┌───────────┐  │       │  Card 0 ↑ (off) │
│ ▔▔▔ Card 2 ▔▔▔  │      │  │  Card 0   │  │       │  Card 1 ↑ (off) │
│ ▔▔▔ Card 3 ▔▔▔  │      │  └───────────┘  │       │ ┌─────────────┐ │
│                 │      │  ┌───────────┐  │       │ │             │ │
│                 │      │  │  Card 1   │  │       │ │   Card 2    │ │
│                 │      │  └───────────┘  │       │ │  (expanded) │ │
│                 │      │  ┌───────────┐  │       │ │             │ │
│                 │      │  │  Card 2   │  │       │ └─────────────┘ │
│                 │      │  └───────────┘  │       │  Card 3 ↓ (off) │
│                 │      │  ┌───────────┐  │       │                 │
│                 │      │  │  Card 3   │  │       │                 │
│                 │      │  └───────────┘  │       │                 │
└─────────────────┘      └─────────────────┘       └─────────────────┘
```

### `useCardStack` Hook — The Brain

This custom hook encapsulates all animation state. It returns shared values and gesture handlers that the `CardStack` and `CardItem` components consume.

**Shared values:**
- `scrollOffset` — driven by PanGesture, controls fan spread
- `selectedCardIndex` — which card is expanded (-1 = none)
- `flipProgress[i]` — per-card flip rotation (0 = front, π = back)
- `draggedCardIndex` — which card is being reordered (-1 = none)
- `dragTranslateY` — vertical offset of the dragged card during reorder

**Gesture handlers:**
- `panGesture` — vertical pan to scroll/fan the stack
- `tapGesture(index)` — tap to select/expand a card
- `longPressGesture(index)` — long-press activates reorder mode (card lifts, scales up slightly, other cards make room as you drag)
- `flipTapGesture(index)` — tap expanded card to flip
- `dismissGesture` — swipe down on expanded card to collapse

**Derived animated styles (per card):**
- `translateY` — interpolated from `scrollOffset`, `selectedCardIndex`, drag state, and card index
- `scale` — slightly smaller for cards further back in the stack (0.98, 0.96, etc.). Dragged card scales to 1.05.
- `zIndex` — reordered during selection and drag animations
- `opacity` — cards far off-screen fade out
- `rotateY` — driven by `flipProgress[i]` for the flip interaction

**Search integration:**
- The stack accepts a `searchQuery` string from the `SearchBar` component
- Filtered cards list is derived in the store (`getFilteredCards(query, sortMode)`)
- When the query changes, cards that don't match fade out and the remaining cards re-stack with a spring animation
- Search matches against card name and logoSlug

**Spring configs:**
- Stack fan: `{ damping: 20, stiffness: 200 }` — responsive, settles quickly
- Card selection: `{ damping: 25, stiffness: 180 }` — slightly softer, more deliberate
- Card flip: `{ damping: 15, stiffness: 250 }` — snappy
- Dismiss: `{ damping: 20, stiffness: 150 }` — gentle return

### Card Flip

The flip is a `rotateY` transform on the card container with two child views (front and back) that swap visibility at the midpoint.

```
  rotateY: 0°          rotateY: 90°        rotateY: 180°
  ┌──────────┐         ┌┐                  ┌──────────┐
  │          │         ││                  │ ████████ │
  │  ESSELUNGA│         ││  (edge-on)       │ ██▌▐██  │ ← barcode
  │          │         ││                  │ ████████ │
  └──────────┘         └┘                  └──────────┘
  front visible        transition          back visible
```

Implementation:
- Container: `transform: [{ perspective: 1000 }, { rotateY: flipProgress }]`
- Front child: `backfaceVisibility: 'hidden'`
- Back child: `backfaceVisibility: 'hidden'`, `transform: [{ rotateY: '180deg' }]` (pre-flipped so it shows correctly when the container rotates to 180°)

This is a well-documented Reanimated pattern. No Skia or R3F needed.

---

## Screen-by-Screen Design

### Home Screen (`app/index.tsx`)

**Layout:** The card stack fills most of the screen. Overlaid UI:
- Top: translucent header with app name (left), sort button (center-right), settings icon (right)
- Search bar sits between the header and the stack — always visible, not hidden behind a pull gesture. Typing filters the stack in place.
- Bottom: floating "+" add button

**States:**
- *Empty:* Centered illustration + "Add your first card" with an animated entrance
- *Single card:* Card centered vertically with subtle idle animation (gentle float: translateY oscillation ±3px, 3s period, easing)
- *Multiple cards:* Stacked, scrollable, tappable
- *Searching:* Non-matching cards fade out, matching cards re-stack smoothly
- *Reordering:* Long-press lifts a card. Drag vertically to reposition. Other cards shift to make room. Drop to confirm. Haptic bump on each position change.

**Sort menu:** Tapping the sort button opens a small popover with three options: Manual (default, drag to reorder), A→Z (alphabetical), Newest first. Changing sort mode re-stacks the cards with a spring animation.

**Key behaviors:**
- Inline search always accessible
- Long-press to reorder (when sort mode is "manual")
- Haptic feedback on card selection, flip, and reorder drop

### Add Card Screen (`app/add.tsx`)

**Enters from bottom** (modal presentation via expo-router).

**Two-tab layout:** "Scan" (default) | "Manual"

**Scan tab:**
- Camera fills the screen with a rounded-rect viewfinder overlay
- On scan: success haptic, card preview slides up with the detected data pre-filled
- User enters name → logo picker auto-suggests matching brands as you type (fuse.js fuzzy search over the brand index). Tap a suggestion to set the logo. Skip to use name fallback.
- Card color is auto-extracted from the logo's dominant color (see Logo Color Extraction below). User can override.
- Camera permission handled with an explanatory interstitial (not a cold system dialog)

**Manual tab:**
- Clean vertical form: Name (with inline logo suggestions) → Code → Format (horizontal chip selector) → Color picker
- Live barcode preview renders below the code input as you type
- Inline validation (red border + helper text, never alert boxes)

**Logo picker behavior:** As the user types the card name, a suggestion row appears below the input showing matching brand icons (in their original colors) + names. Tapping a suggestion sets the `logoSlug` and auto-fills the card color from the logo's dominant color. The user can override the color. The user can dismiss suggestions to proceed without a logo. The picker supports scrolling through results and shows "No match found — using card name" when nothing matches.

### Card Detail Screen (`app/card/[id].tsx`)

**Enters via shared element transition** — the card in the stack animates to its position in the detail screen (Reanimated layout animations).

**Layout:**
- Top 40%: The card, flippable. Tap to flip between name face and barcode face. Subtle idle tilt animation (parallax based on device gyro if available, otherwise gentle rotation).
- Bottom 60%: Bottom sheet with card info. Name (editable inline), format badge, notes (expandable text area), color picker, timestamps.

**Full-screen barcode mode:** Long-press from the stack, or flip the expanded card and long-press the barcode face. No dedicated button — gestures only. Overlays everything. Dark background, barcode centered and scaled to max width, code in monospace below. Brightness auto-maxed. Dismiss: tap anywhere or swipe down.

### Settings Screen (`app/settings.tsx`)

Simple, clean.

1. **Theme:** System / Light / Dark — segmented control
2. **Data:** Export (share as JSON) / Import (pick file, inline conflict resolution)
3. **About:** Version, "Made to replace Stocard", GitHub link

---

## Data Model

Extended from v1 with logo support and ordering:

```typescript
type CardId = string; // uuid

type BarcodeFormat =
  | 'QR' | 'EAN13' | 'EAN8' | 'CODE128' | 'CODE39'
  | 'UPCA' | 'UPCE' | 'PDF417' | 'AZTEC' | 'DATAMATRIX' | 'ITF14';

type SortMode = 'manual' | 'alphabetical' | 'dateCreated';

interface FidelityCard {
  id: CardId;
  name: string;
  code: string;
  format: BarcodeFormat;
  color?: string;       // hex, default #42A5F5
  logoSlug?: string;    // Simple Icons slug (e.g. "esselunga"). Absent = use name fallback.
  notes?: string;
  sortIndex: number;    // Manual ordering position. Ignored when sortMode != 'manual'.
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}

interface Settings {
  themeMode: 'system' | 'light' | 'dark';
  sortMode: SortMode;   // Default: 'manual'
}
```

**Backward compatibility:** v1 imports work — missing `logoSlug` defaults to absent (name fallback), missing `sortIndex` defaults to creation order, missing `sortMode` defaults to `'manual'`.

---

## Visual Identity

### Color System

The app's chrome is neutral. The cards bring the color.

- **Background:** `#0A0A0A` (dark) / `#FAFAF8` (light)
- **Surface:** Slight elevation, subtle blur on overlaid elements
- **Text:** `#F5F5F5` (dark) / `#1A1A1A` (light)
- **Accent:** Dynamic — the top card's color tints interactive elements (add button, active tab, status bar). When no card is selected, a neutral warm tone.
- **Card palette:** 24 colors, grouped by hue. Each color has light/dark variants for text legibility.

### Typography

System fonts (SF Pro on iOS, Roboto on Android). No custom font loading.

- Card names: 18pt medium
- Barcode display: monospace
- UI labels: 14pt regular
- Section headers: 13pt semibold, uppercase tracking (sparingly)

### Motion Language

1. **Springs everywhere.** `withSpring()` is the default. `withTiming()` only for opacity fades.
2. **Touch-responsive.** Cards track your finger via gesture shared values. No perceptible lag — Reanimated worklets guarantee this.
3. **Haptic punctuation.** Light impact on stack scroll snap, medium on card select/flip, success notification on barcode scan.
4. **Idle breathing.** Top card has a subtle scale pulse (1.0 ↔ 1.003, 4s period) and gentle translateY float (±2px, 3s period, offset phase). Stops immediately on touch.

---

## Implementation Order

| Phase | What | Depends on | Estimated effort |
|-------|------|------------|-----------------|
| **1** | Project scaffold: Expo 55, expo-router, Reanimated, GH, Zustand, TypeScript | — | Half day |
| **2** | Data layer: types (with logoSlug, sortIndex), Zustand stores with AsyncStorage persistence, card ordering logic | Phase 1 | 1 day |
| **3** | Theme system: color tokens, ThemeProvider, useTheme, dark/light switch, dynamic accent | Phase 1 | Half day |
| **4** | Store logo system: build brand-index.json from Simple Icons, `logos.ts` service with fuse.js search, `LogoPicker` component | Phase 1 | 1–2 days |
| **5** | Card stack interaction: `useCardStack` hook, `CardStack`, `CardItem`, fan/scroll/select/dismiss | Phase 2, 3 | 3–4 days (core of the app) |
| **6** | Card flip: `CardFlip`, `CardFace` (with logo rendering), `CardBack` with barcode rendering | Phase 4, 5 | 1–2 days |
| **7** | Search + sort: `SearchBar` inline filtering, `SortMenu` with three modes, reorder via long-press drag | Phase 5 | 2 days |
| **8** | Add Card screen: manual form with logo picker + barcode scanner | Phase 2, 4 | 2 days |
| **9** | Card Detail screen: expanded view, inline edit, full-screen barcode modal | Phase 5, 6 | 2 days |
| **10** | Settings screen: theme toggle, import/export with conflict resolution | Phase 2, 3 | 1 day |
| **11** | Polish: haptics, empty states, error handling, transitions between screens | Phase 5–10 | 2 days |
| **12** | Optional: Skia upgrade for card face rendering (GPU gradients, soft shadows) | Phase 11 | 2–3 days |
| **13** | Performance audit on mid-range device, bundle size check (especially logo assets) | Phase 11 | 1 day |

Total estimate: ~3 weeks of focused work for Phase 1–11. Phase 12 is optional polish. Widgets deferred to a future version.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reanimated 4 + Expo SDK 55 compatibility | Blocks animation work | Reanimated 4 is officially supported in SDK 55. Use dev build, not Expo Go. |
| Gesture conflicts (pan vs tap vs long-press on same card) | Broken UX | Use Gesture Handler's `simultaneousHandlers` and `waitFor` to compose gestures correctly. Long-press for reorder must coexist with pan-to-scroll. Prototype this in Phase 5. |
| Card flip `backfaceVisibility` inconsistent across Android devices | Visual glitch | Well-documented Reanimated pattern. Test on 2-3 Android devices early. Fallback: opacity swap at midpoint instead of backface. |
| Stack performance with 50+ cards | Jank | Only render cards within a window (±5 from scroll position). Cards outside the window are unmounted. Like a virtualized FlatList, but for the stack. |
| Barcode rendering library compatibility with SDK 55 | Can't display barcodes | `@kichiyaki/react-native-barcode-generator` is actively maintained. Pin version. Have `react-native-svg` based fallback. |
| Shared element transitions between stack and detail screen | Hard to get right | expo-router supports layout animations. Start simple (fade + slide), upgrade to shared element if time allows. |
| Simple Icons coverage gaps for local/regional stores | User can't find their store | Fallback to name initial is always available and looks good. Consider allowing users to contribute missing logos upstream (Simple Icons accepts PRs). |
| Logo bundle size bloat | Large app download | Start with full bundle (~5-10MB). If too large, ship top-500 brands and lazy-download the rest. Monitor with Phase 13 audit. |
| Reorder drag + scroll gesture conflict | Can't drag cards without scrolling | Long-press enters reorder mode (with haptic), which disables scroll. Only pan gestures during reorder are treated as drag. Release exits reorder mode. |

---

## Build & Deploy

**Local builds only.** No EAS cloud builds. Artifacts are built on your machine and manually uploaded to the App Store / Play Store.

### Prerequisites

- **macOS** required (for iOS builds)
- **Xcode** (latest stable) with iOS simulators and command line tools
- **Android Studio** with Android SDK, NDK, and a configured emulator or device
- **Fastlane** (optional but recommended for automating signing and upload)
- **CocoaPods** (`gem install cocoapods`)
- **eas-cli** installed globally (`npm install -g eas-cli`)

### Configuration

`eas.json` must be configured for local builds:

```json
{
  "cli": {
    "version": ">= 15.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### Build Commands

```bash
# Development build (for testing with dev client)
eas build --platform ios --local --profile development
eas build --platform android --local --profile development

# Production build (for store submission)
eas build --platform ios --local --profile production
eas build --platform android --local --profile production
```

The `--local` flag runs the entire build pipeline on your machine instead of EAS servers. Output is an `.ipa` (iOS) or `.aab` (Android) file.

### Store Submission

Manual upload:
- **iOS:** Use Xcode's Organizer or `xcrun altool` to upload the `.ipa` to App Store Connect. Or use Fastlane's `deliver`.
- **Android:** Upload the `.aab` to the Google Play Console manually via the web interface. Or use Fastlane's `supply`.

EAS Submit can also handle the upload step locally:
```bash
eas submit --platform ios --path ./build/tesserone.ipa
eas submit --platform android --path ./build/tesserone.aab
```

### Environment Variables

```bash
# Skip cleanup to inspect build artifacts (debugging)
EAS_LOCAL_BUILD_SKIP_CLEANUP=1

# Custom working directory for build output
EAS_LOCAL_BUILD_WORKINGDIR=./build-output
```

### Phase 1 Checklist (project scaffold)

This must be validated before any feature work:

1. `npx create-expo-app tesserone` with Expo SDK 55
2. Install and configure `eas-cli`, create `eas.json`
3. Run `eas build --platform ios --local --profile development` — confirm it produces a working `.app`
4. Run `eas build --platform android --local --profile development` — confirm it produces a working `.apk`
5. Install dev builds on physical devices
6. Confirm Reanimated and Gesture Handler work in the dev build (not Expo Go)

If step 3 or 4 fails, fix the toolchain before writing any app code.

---

## Migration Path from v1 (Cardshive)

1. Extended data model → v1 JSON exports import into v2 with defaults for new fields (`logoSlug`: absent, `sortIndex`: creation order, `sortMode`: manual)
2. Same AsyncStorage keys (`cards`, `settings`) → existing v1 data is read automatically, migrated on first launch
3. Same barcode format enum → no mapping needed
4. New bundle ID (`com.chipcolate.tesserone`, was `com.chipcolate.cardshive`) → this is a new app listing, not an in-place upgrade. Users export from Cardshive, import into Tesserone.

---

## Resolved Decisions

1. **Store logos:** Extensive. Simple Icons (3,400+ brands, CC0). Bundled SVGs with fuse.js fuzzy search. Fallback to store name initial when no match.
2. **Search:** Inline in the stack. Always-visible search bar, filters in place with spring animations.
3. **Reorder:** Yes. Long-press drag in manual sort mode, plus quick-sort shortcuts (A→Z, newest first).
4. **Widgets:** Deferred to a future version. Architecture supports it (card data in AsyncStorage, accessible from widget extension).
5. **Open source:** Day 1 on GitHub. MIT license.
6. **Brand color auto-fill:** Yes. Card color is auto-derived from the brand's official hex (shipped in Simple Icons metadata). Dominant color extracted, used to generate a complementary card background. User can override.
7. **Logo rendering:** Original brand colors, not tinted. Recognizability over visual consistency.
8. **Full-screen barcode trigger:** Gestures only, no button. Long-press from stack, or long-press the barcode face of a flipped expanded card.
9. **Build & deploy:** Local builds only (`eas build --local`). No EAS cloud. Manual upload to stores. macOS + Xcode + Android Studio required.
