# JetBrains Mono (vendored)

The four weights Tesserone actually uses, vendored so native iOS/Android can
bundle them without npm.

**License:** SIL Open Font License 1.1 (`OFL.txt`). Copyright 2020 The
JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono).

**Expo** continues to load faces from `@expo-google-fonts/jetbrains-mono`
until cutover. These files are for the native apps only.

## Faces

| File | PostScript name | Weight |
| --- | --- | --- |
| `JetBrainsMono-Regular.ttf` | `JetBrainsMono-Regular` | 400 |
| `JetBrainsMono-Medium.ttf` | `JetBrainsMono-Medium` | 500 |
| `JetBrainsMono-Bold.ttf` | `JetBrainsMono-Bold` | 700 |
| `JetBrainsMono-ExtraBold.ttf` | `JetBrainsMono-ExtraBold` | 800 |

Copied from `@expo-google-fonts/jetbrains-mono` (`400Regular`, `500Medium`,
`700Bold`, `800ExtraBold`).

## Registration

Native apps must register and select each face by its PostScript / family
name. Do **not** apply `fontWeight` (or `UIFont.Weight` / Android
`fontWeight`) to synthesize a heavier cut — Android faux-bolds a missing
weight, and Regular + Bold share the name-table family `JetBrains Mono`, so
a weight request can pick the wrong face.

Use one registered family per file, matching the Expo map in
`src/theme/fonts.ts`:

- Regular → `JetBrainsMono-Regular`
- Medium → `JetBrainsMono-Medium`
- Bold → `JetBrainsMono-Bold`
- ExtraBold → `JetBrainsMono-ExtraBold`
