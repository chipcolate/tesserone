# Design tokens

Canonical color, geometry, and type tokens for Tesserone. The React Native app
and the native rewrite both read these files.

| File | Owns |
|---|---|
| `colors.json` | Palettes, accent, card swatches, contrast helpers |
| `geometry.json` | Corner radii (Raw Aesthetic — everything squared) |
| `typography.json` | Type scale (size, tracking, leading, transform, weight) |

## colors.json

- `dark` / `light` — `bg`, `surface`, `text`, `textSecondary`, `border`, `borderStrong`, `danger`, `dangerText`
- `defaultAccent` — Chipcolate purple (`#6C2DD7`); runtime accent starts here
- `defaultCardColor` — default swatch when adding a card (`#42A5F5`)
- `fallbackCardBg` — card background when no color and no brand (`#333333`)
- `cardColors` — picker swatches, same order as the app (pairs of hue then neutrals black / grey / white)
- `lightTextOnColorThreshold` — W3C perceived-brightness cutoff (155); at or below → light text
- `onLight` / `onDark` — `#000000` / `#FFFFFF` for text on a card color

`isLightColor()` / `textOnColor()` stay in TypeScript (`src/theme/colors.ts`).

## geometry.json

`chromeRadius` (buttons, inputs, panels, sheets, FAB), `cardRadius` (card object),
`tileRadius` (barcode tile on the card back).

## typography.json

One object per role. `fontWeight` is `regular | medium | bold | extrabold` — not a
platform font-family string. RN maps weight → `JetBrainsMono_*` in `src/theme/fonts.ts`.

`letterSpacing`, `lineHeight`, and `textTransform` are `null` when the role uses
the platform default (do not emit `0` / `"none"` — those are explicit values).
