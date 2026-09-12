# Tesserone iOS (native)

Native iOS app: phone wallet plus Apple Watch, WidgetKit, and Share Extension.
TesseroneKit is the shared Swift package (iOS 17 + watchOS 10).

Requires **Xcode 16+**. `Tesserone.xcodeproj` is checked in. `project.yml` is
optional (XcodeGen) and is not required on burago.

## Identity

| | |
| --- | --- |
| Bundle ID | `com.chipcolate.tesserone` |
| Team ID | `HNF5BY9XXV` |
| App Group | `group.com.chipcolate.tesserone` |
| Version / build | 2.0.0 / 17 |
| Deployment | iOS 17+, iPhone only |
| URL scheme | `tesserone` (`tesserone://open/<id>`, `tesserone://add`) |
| Watch | `com.chipcolate.tesserone.watchkitapp` |
| Widget | `com.chipcolate.tesserone.widget` (kinds `TesseroneSingleCard`, `TesseroneCardList`) |
| Share | `com.chipcolate.tesserone.share` |

Native store: App Group `store/wallet.json` and `store/custom-logos/`. Widget
snapshot is `widgets/snapshot.json` + `widgets/logos/`. Share writes
`store/pending-scan.json` then opens `tesserone://add`. Brand index and logos
are bundled from `shared/brands` (not duplicated here). Copy is
`shared/i18n/{en,it,fr,es,de}.json`; faces are `shared/fonts` JetBrains Mono
(Regular/Medium/Bold/ExtraBold). Both are Xcode synchronized resource groups,
not copies in `apps/ios`.

## Generate & build (burago)

```
export PATH=$HOME/.bun/bin:/opt/homebrew/bin:$PATH
cd ~/builds/tesserone/apps/ios
xcodebuild -project Tesserone.xcodeproj -scheme Tesserone -destination 'platform=iOS Simulator,name=iPhone 16 Plus' -configuration Debug build CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=""
```

## Tests

`TesseroneKit` is a local Swift package. From this machine (or the Mac):

```
cd apps/ios/TesseroneKit
swift test
```

Linux will fail if Swift is not installed; that is expected. Fixtures under
`TesseroneKit/Tests/TesseroneKitTests/Fixtures/` are copies of
`shared/schema/fixtures/`.
