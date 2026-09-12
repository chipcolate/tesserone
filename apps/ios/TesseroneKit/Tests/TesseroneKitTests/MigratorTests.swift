import Foundation
import XCTest
@testable import TesseroneKit

final class MigratorTests: XCTestCase {
    func testMD5OfCardsKeyMatchesDocumentedDigest() {
        XCTAssertEqual(AsyncLocalStorage.md5Hex("cards"), AsyncLocalStorage.cardsKeyDigest)
        XCTAssertEqual(AsyncLocalStorage.md5Hex("cards"), "492e6640145b729207a5816b2fdb47f3")
    }

    func testUnwrapZustandPersist() throws {
        let data = try Fixtures.data("asyncstorage-cards-v2")
        let envelope = try ZustandPersist.unwrap(data, as: CardsPersistState.self)
        XCTAssertEqual(envelope.version, 2)
        XCTAssertEqual(envelope.state.cards["card-001"]?.name, "Demo Market")
        XCTAssertEqual(envelope.state.cards["card-001"]?.customLogoUri, "1710000000000-abcd1234.jpg")

        let object = try JSONSerialization.jsonObject(with: data)
        let unwrapped = ZustandPersist.unwrapJSON(object)
        XCTAssertNotNil(unwrapped)
        XCTAssertEqual(unwrapped?.version, 2)
    }

    func testV1CustomLogoURIFilenameCollapse() throws {
        let json = try Fixtures.string("asyncstorage-cards-v1-legacy-uri")
        let cards = CardNormalization.cards(fromPersistJSON: json)
        XCTAssertEqual(cards["card-001"]?.customLogoUri, "old.jpg")
        XCTAssertEqual(
            CustomLogoRef.filename(
                from: "file:///var/mobile/Containers/Data/Application/UUID/Documents/custom-logos/old.jpg"
            ),
            "old.jpg"
        )
    }

    func testLowercaseFormatNormalizedToEAN13() throws {
        let json = try Fixtures.string("asyncstorage-lowercase-format")
        let cards = CardNormalization.cards(fromPersistJSON: json)
        XCTAssertEqual(cards["card-001"]?.format, .ean13)
        XCTAssertEqual(BarcodeFormat.normalize("ean13"), .ean13)
        XCTAssertEqual(BarcodeFormat.normalize("itf"), .itf14)
        XCTAssertEqual(BarcodeFormat.normalize("unknown"), .code128)
        XCTAssertEqual(BarcodeFormat.normalize("not-a-format"), .code128)
    }

    func testSettingsAndTutorialPersist() throws {
        let settings = CardNormalization.settings(fromPersistJSON: try Fixtures.string("asyncstorage-settings-v2"))
        XCTAssertEqual(settings, .default)
        let tutorial = CardNormalization.tutorial(fromPersistJSON: try Fixtures.string("asyncstorage-tutorial-v1"))
        XCTAssertEqual(tutorial.enabled, true)
        XCTAssertEqual(tutorial.seenSteps, [:])
    }

    func testSettingsV1MissingLanguageDefaultsToSystem() {
        let json = #"{"state":{"themeMode":"dark","sortMode":"alphabetical"},"version":1}"#
        let settings = CardNormalization.settings(fromPersistJSON: json)
        XCTAssertEqual(settings.themeMode, .dark)
        XCTAssertEqual(settings.sortMode, .alphabetical)
        XCTAssertEqual(settings.language, .system)
    }

    func testEmptyNativeStoreDefaults() async throws {
        let data = try Fixtures.data("native-empty")
        let doc = try JSONDecoder().decode(WalletDocument.self, from: data)
        XCTAssertEqual(doc.schemaVersion, 1)
        XCTAssertTrue(doc.cards.isEmpty)
        XCTAssertEqual(doc.settings, .default)
        XCTAssertEqual(doc.tutorial, .default)
        XCTAssertFalse(doc.migratedFromExpo)

        let dir = try Fixtures.makeTempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let store = WalletStore(rootURL: dir)
        try await store.load()
        let snapshot = await store.snapshot()
        XCTAssertTrue(snapshot.cards.isEmpty)
        XCTAssertEqual(snapshot.settings, .default)
        XCTAssertFalse(snapshot.migratedFromExpo)
    }

    func testSidecarNullManifestReadsMD5File() throws {
        let dir = try Fixtures.makeTempDir()
        defer { try? FileManager.default.removeItem(at: dir) }

        let manifest = try Fixtures.data("ios-manifest-sidecar")
        try manifest.write(to: dir.appendingPathComponent("manifest.json"))
        let cardsBlob = try Fixtures.string("asyncstorage-cards-v2")
        try cardsBlob.write(
            to: dir.appendingPathComponent(AsyncLocalStorage.md5Hex("cards")),
            atomically: true,
            encoding: .utf8
        )

        let values = try AsyncLocalStorage.readManifest(directory: dir)
        XCTAssertEqual(values["cards"], cardsBlob)
        XCTAssertNotNil(values["settings"])
        XCTAssertNotNil(values["tutorial"])

        let cards = CardNormalization.cards(fromPersistJSON: values["cards"]!)
        XCTAssertEqual(cards["card-001"]?.name, "Demo Market")
        XCTAssertEqual(cards["card-001"]?.customLogoUri, "1710000000000-abcd1234.jpg")
    }

    func testMigratorImportsExpoWalletAndCopiesLogos() async throws {
        let nativeRoot = try Fixtures.makeTempDir()
        let expoRoot = try Fixtures.makeTempDir()
        defer {
            try? FileManager.default.removeItem(at: nativeRoot)
            try? FileManager.default.removeItem(at: expoRoot)
        }

        let asyncDir = expoRoot.appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true)
        try FileManager.default.createDirectory(at: asyncDir, withIntermediateDirectories: true)
        try Fixtures.data("ios-manifest-sidecar").write(to: asyncDir.appendingPathComponent("manifest.json"))
        try Fixtures.string("asyncstorage-cards-v2").write(
            to: asyncDir.appendingPathComponent(AsyncLocalStorage.md5Hex("cards")),
            atomically: true,
            encoding: .utf8
        )

        let expoLogos = expoRoot.appendingPathComponent("custom-logos", isDirectory: true)
        try FileManager.default.createDirectory(at: expoLogos, withIntermediateDirectories: true)
        try Data("logo".utf8).write(to: expoLogos.appendingPathComponent("1710000000000-abcd1234.jpg"))

        let store = WalletStore(rootURL: nativeRoot)
        let outcome = try await ExpoMigrator.migrateIfNeeded(
            store: store,
            asyncStorageDirectory: asyncDir,
            expoCustomLogosDirectory: expoLogos
        )
        XCTAssertTrue(outcome.migrated)
        XCTAssertFalse(outcome.skipped)
        XCTAssertEqual(outcome.cardCount, 1)

        let snap = await store.snapshot()
        XCTAssertTrue(snap.migratedFromExpo)
        XCTAssertEqual(snap.cards["card-001"]?.name, "Demo Market")
        XCTAssertEqual(snap.cards["card-001"]?.customLogoUri, "1710000000000-abcd1234.jpg")
        XCTAssertTrue(
            FileManager.default.fileExists(
                atPath: nativeRoot.appendingPathComponent("custom-logos/1710000000000-abcd1234.jpg").path
            )
        )
        // Expo storage is left in place.
        XCTAssertTrue(FileManager.default.fileExists(atPath: asyncDir.appendingPathComponent("manifest.json").path))
    }

    func testMigratorSkipsWhenNativeStoreHasCards() async throws {
        let nativeRoot = try Fixtures.makeTempDir()
        let asyncDir = try Fixtures.makeTempDir()
        defer {
            try? FileManager.default.removeItem(at: nativeRoot)
            try? FileManager.default.removeItem(at: asyncDir)
        }

        try Fixtures.data("native-one-card").write(to: nativeRoot.appendingPathComponent("wallet.json"))
        try Fixtures.data("ios-manifest-sidecar").write(to: asyncDir.appendingPathComponent("manifest.json"))

        let store = WalletStore(rootURL: nativeRoot)
        let outcome = try await ExpoMigrator.migrateIfNeeded(
            store: store,
            asyncStorageDirectory: asyncDir,
            expoCustomLogosDirectory: asyncDir
        )
        XCTAssertTrue(outcome.skipped)
        XCTAssertFalse(outcome.migrated)
        XCTAssertEqual(outcome.cardCount, 1)
        let snap = await store.snapshot()
        XCTAssertEqual(snap.cards["card-001"]?.name, "Demo Market")
        XCTAssertFalse(snap.migratedFromExpo)
    }

    func testMigratorCollapsesV1LogoURI() async throws {
        let nativeRoot = try Fixtures.makeTempDir()
        let asyncDir = try Fixtures.makeTempDir()
        defer {
            try? FileManager.default.removeItem(at: nativeRoot)
            try? FileManager.default.removeItem(at: asyncDir)
        }

        var manifest: [String: String] = [:]
        manifest["cards"] = try Fixtures.string("asyncstorage-cards-v1-legacy-uri")
        let manifestData = try JSONSerialization.data(withJSONObject: manifest)
        try manifestData.write(to: asyncDir.appendingPathComponent("manifest.json"))

        let store = WalletStore(rootURL: nativeRoot)
        let outcome = try await ExpoMigrator.migrateIfNeeded(
            store: store,
            asyncStorageDirectory: asyncDir,
            expoCustomLogosDirectory: asyncDir.appendingPathComponent("missing")
        )
        XCTAssertTrue(outcome.migrated)
        let snap = await store.snapshot()
        XCTAssertEqual(snap.cards["card-001"]?.customLogoUri, "old.jpg")
    }

    func testMigratorWithNoExpoDataIsOneShot() async throws {
        let nativeRoot = try Fixtures.makeTempDir()
        let missing = nativeRoot.appendingPathComponent("no-async-storage")
        defer { try? FileManager.default.removeItem(at: nativeRoot) }

        let store = WalletStore(rootURL: nativeRoot)
        let first = try await ExpoMigrator.migrateIfNeeded(
            store: store,
            asyncStorageDirectory: missing,
            expoCustomLogosDirectory: missing
        )
        XCTAssertFalse(first.migrated)
        XCTAssertFalse(first.skipped)
        let snapshot = await store.snapshot()
        XCTAssertTrue(snapshot.migratedFromExpo)

        let second = try await ExpoMigrator.migrateIfNeeded(
            store: store,
            asyncStorageDirectory: missing,
            expoCustomLogosDirectory: missing
        )
        XCTAssertTrue(second.skipped)
        XCTAssertFalse(second.migrated)
    }
}
