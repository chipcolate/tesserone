# Tesserone Android (native)

Kotlin / Jetpack Compose. No React Native.

## Modules

- `:core` — wallet JSON store, Expo `RKStorage` migrator, brand index, barcode validation, import/export, `WatchSnapshot` wire contract
- `:app` — Compose phone app, Glance home-screen widgets, Wear Data Layer push
- `:wear` — Wear OS 3 companion (card list + barcode). `applicationId` is the same as the phone (`com.chipcolate.tesserone`) so the Data Layer can sync; the watch APK declares `android.hardware.type.watch`.

Native store: `filesDir/store/wallet.json`. Custom logos: `filesDir/custom-logos/`. Brand assets are copied at build time from `../../shared/brands/` into `:core` assets (not checked in).

## Home-screen widgets (Glance)

Replaces the Expo `react-native-android-widget` providers.

| Widget | Size | Notes |
|---|---|---|
| **SingleCard** (`SingleCardWidgetReceiver`) | ~1×1, min 40dp, not resizable, reconfigurable | Tap → `tesserone://open/<id>` |
| **CardList** (`CardListWidgetReceiver`) | 4×2, min 250×110, resizable, reconfigurable | Tap a cell → that card |

Labels/descriptions come from `shared/i18n` `widget.*` (and the matching `res/values*/strings.xml` for the system picker). Empty state: “Add a card in Tesserone”. Config activity is Compose (`WidgetConfigurationActivity`). Wallet saves call `GlanceAppWidgetManager` / `updateAll`.

**Existing Expo / RN widgets are dropped on update.** The provider class names changed (`com.reactnativeandroidwidget…` → `com.chipcolate.tesserone.widget.SingleCardWidgetReceiver` / `CardListWidgetReceiver`), so Android treats them as a different widget. Users re-add SingleCard / CardList from the picker.

## Wear OS companion

Phone `:app` pushes `WatchSnapshot` v1 JSON (same schema as `src/types.ts`) plus logo assets over the Wearable Data Layer. Wear observes `DataClient`, shows a card list, and renders EAN-13/8, UPC-A, CODE39, ITF-14, CODE128, and QR via ZXing (`:core`). Other formats show “Open on phone”.

No Wear system image is downloaded by the build. `./gradlew :wear:assembleDebug` compiles against the Wear libraries on Maven if the Android SDK (compileSdk 35) is installed.

## Build (burago)

```
export PATH=$HOME/.bun/bin:/opt/homebrew/bin:$PATH
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=$HOME/Library/Android/sdk ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
cd ~/builds/tesserone/apps/android
./gradlew :core:test :app:assembleDebug :wear:assembleDebug
```

First-time wrapper (if `gradlew` is missing):

```
gradle wrapper --gradle-version 8.11.1
```

`local.properties` (`sdk.dir=…`) is gitignored; the Android Gradle Plugin also reads `ANDROID_HOME`.
