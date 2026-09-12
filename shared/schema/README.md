# Wallet / export schema

Canonical shapes for the native rewrite. Three different JSON documents; do not mix them.

| Document | Schema | Who writes it | Shape |
| --- | --- | --- | --- |
| Native store | [`wallet.schema.json`](wallet.schema.json) | Native app | One file: `{ schemaVersion, cards, settings, tutorial }` |
| Expo AsyncStorage | (no schema; see fixtures) | Zustand persist | Three keys, each `{ state, version }` |
| User export | [`export.schema.json`](export.schema.json) | Share / backup | `{ cards[], settings?, exportedAt, version }` |

`schemaVersion` (integer, native document) is not the export `version` string (`"2.1.0"`).

## Native document

Single on-disk wallet. `cards` is a map keyed by `FidelityCard.id`. `format` is uppercase. `customLogoUri` is a **bare filename** (or omitted) — the PNG/JPEG lives in the custom-logos directory; the JSON never stores a `file://` URI or a data URI.

Defaults match the Expo stores: `themeMode`/`sortMode`/`language` = `system`/`manual`/`system`; tutorial `enabled: true`, `seenSteps: {}`.

## Expo AsyncStorage (migration source)

Zustand persist middleware, no `partialize`. Functions are dropped by `JSON.stringify`.

| Key | Persist version | `state` |
| --- | --- | --- |
| `cards` | 2 | `{ cards: { [id]: FidelityCard } }` |
| `settings` | 2 | `{ themeMode, sortMode, language }` |
| `tutorial` | 1 | `{ enabled, seenSteps }` |

Migrations the native importer must apply when reading these blobs:

1. **cards v1 → v2** — `customLogoUri` was a full `file://…/custom-logos/<name>` URI. Collapse to the filename (`old.jpg`). See `asyncstorage-cards-v1-legacy-uri.json`.
2. **settings v1 → v2** — missing `language` defaults to `"system"`.
3. **Lowercase `format`** — map via the table below (same as Expo `importExport.ts`). Unknown values become `CODE128`. See `asyncstorage-lowercase-format.json`.

### iOS (`RCTAsyncLocalStorage_V1`)

`Library/Application Support/<bundle>/RCTAsyncLocalStorage_V1/manifest.json` maps each key to its string value. Values longer than 1024 characters (`RCTInlineValueThreshold`) are written to a **sidecar file named `md5(key)` (hex)** next to the manifest, and the manifest value is `null`.

`md5("cards")` = `492e6640145b729207a5816b2fdb47f3`. Fixture: `fixtures/ios-manifest-sidecar.json` (`"cards": null`).

### Android (`RKStorage`)

Legacy AsyncStorage: SQLite file `RKStorage`, table `catalystLocalStorage` (`key`, `value`). Values are always inlined; no sidecar.

## User export file

Backup / single-card share-out. `cards` is an **array**. Current producer writes `version: "2.1.0"` and inlines custom logos as `data:image/…;base64,…` URIs. `settings` is partial (Expo currently exports `themeMode` + `sortMode`; `language` may be absent).

On import, missing `sortIndex`/`createdAt`/`updatedAt` are filled; `customLogoUri` data URIs are materialized to files; `file://` URIs collapse to a filename. Conflict strategies: `keepExisting` | `useImported` | `keepNewer` (compare `updatedAt`).

## Format aliases (import / migrator)

| Stored | Canonical |
| --- | --- |
| `qr` | `QR` |
| `ean13` | `EAN13` |
| `ean8` | `EAN8` |
| `code128` | `CODE128` |
| `code39` | `CODE39` |
| `upcA` | `UPCA` |
| `upcE` | `UPCE` |
| `pdf417` | `PDF417` |
| `aztec` | `AZTEC` |
| `datamatrix` | `DATAMATRIX` |
| `itf` | `ITF14` |
| `unknown` | `CODE128` |

## Fixtures

| File | What |
| --- | --- |
| `native-empty.json` | Empty native document, defaults |
| `native-one-card.json` | One EAN-13 card, default settings, tutorial enabled |
| `export-v2.1.json` | One-card 2.1.0 export with a 1×1 PNG data-URI logo |
| `asyncstorage-cards-v2.json` | Persist `{state, version:2}`, `customLogoUri` is a bare filename |
| `asyncstorage-cards-v1-legacy-uri.json` | Persist v1; migrator must collapse the `file://` URI to `old.jpg` |
| `asyncstorage-settings-v2.json` | Persist `{state:{themeMode,sortMode,language}, version:2}` |
| `asyncstorage-tutorial-v1.json` | Persist `{state:{enabled:true, seenSteps:{}}, version:1}` |
| `asyncstorage-lowercase-format.json` | Persist blob with `"format": "ean13"` |
| `ios-manifest-sidecar.json` | RCTAsyncLocalStorage manifest; `"cards": null` → sidecar `492e6640…` |
