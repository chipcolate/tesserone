# Shared (cross-app, not cross-runtime)

Canonical assets and contracts for the native iOS and Android apps. There is
**no shared runtime** (no KMP, no C core). Each app reimplements logic against
these files.

| Path | What |
|---|---|
| `brands/` | `brand-index.json` + logo PNGs |
| `i18n/` | en/it/fr/es/de copy (`{{name}}` interpolation, `_one`/`_other` plurals) |
| `tokens/` | Raw Aesthetic colors, radii, type scale |
| `motion/` | Card-stack spacing and spring constants |
| `fonts/` | JetBrains Mono OFL (Regular/Medium/Bold/ExtraBold) |
| `schema/` | Native wallet JSON, export JSON, AsyncStorage migration fixtures |

The Expo app at the repo root still ships until cutover; it now **reads** brands,
i18n, tokens, and motion from here so the index has one owner.
