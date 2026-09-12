import Foundation
import XCTest
@testable import TesseroneKit

final class ImportExportTests: XCTestCase {
    func testParseExportV21MaterializesDataURILogo() throws {
        let dir = try Fixtures.makeTempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let logos = CustomLogoStore(directory: dir.appendingPathComponent("custom-logos"))

        let result = try ImportExport.parse(try Fixtures.data("export-v2.1"), logos: logos)
        XCTAssertEqual(result.version, "2.1.0")
        XCTAssertEqual(result.cards.count, 1)
        let card = result.cards[0]
        XCTAssertEqual(card.id, "card-001")
        XCTAssertEqual(card.format, .ean13)
        XCTAssertEqual(result.settings.themeMode, .system)
        XCTAssertEqual(result.settings.sortMode, .manual)
        XCTAssertNil(result.settings.language)

        let filename = try XCTUnwrap(card.customLogoUri)
        XCTAssertFalse(filename.hasPrefix("data:"))
        XCTAssertFalse(filename.contains("/"))
        XCTAssertTrue(
            FileManager.default.fileExists(atPath: logos.directory.appendingPathComponent(filename).path)
        )
    }

    func testMergeStrategies() throws {
        let older = sampleCard(id: "card-001", updatedAt: "2026-01-01T00:00:00.000Z", name: "Older")
        let newer = sampleCard(id: "card-001", updatedAt: "2026-06-17T09:30:00.000Z", name: "Newer")
        let extra = sampleCard(id: "card-002", updatedAt: "2026-06-17T09:30:00.000Z", name: "Extra")

        let existing = ["card-001": older]
        let imported = [newer, extra]

        XCTAssertEqual(ImportExport.detectConflicts(existing: existing, imported: imported), 1)

        let keepExisting = ImportExport.mergeCards(existing: existing, imported: imported, strategy: .keepExisting)
        XCTAssertEqual(keepExisting["card-001"]?.name, "Older")
        XCTAssertEqual(keepExisting["card-002"]?.name, "Extra")

        let useImported = ImportExport.mergeCards(existing: existing, imported: imported, strategy: .useImported)
        XCTAssertEqual(useImported["card-001"]?.name, "Newer")

        let keepNewer = ImportExport.mergeCards(existing: existing, imported: imported, strategy: .keepNewer)
        XCTAssertEqual(keepNewer["card-001"]?.name, "Newer")

        let keepOlderWhenImportedIsStale = ImportExport.mergeCards(
            existing: ["card-001": newer],
            imported: [older],
            strategy: .keepNewer
        )
        XCTAssertEqual(keepOlderWhenImportedIsStale["card-001"]?.name, "Newer")
    }

    func testExportVersionAndRoundTrip() throws {
        let dir = try Fixtures.makeTempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let logos = CustomLogoStore(directory: dir.appendingPathComponent("custom-logos"))
        try logos.ensureDirectory()
        try Data([0x00, 0x01, 0x02]).write(to: logos.directory.appendingPathComponent("mark.jpg"))

        let card = sampleCard(
            id: "card-001",
            updatedAt: "2026-06-17T09:30:00.000Z",
            name: "Demo Market",
            customLogoUri: "mark.jpg"
        )
        let doc = ImportExport.makeExport(
            cards: [card],
            settings: .default,
            logos: logos,
            exportedAt: "2026-06-17T09:30:00.000Z"
        )
        XCTAssertEqual(doc.version, "2.1.0")
        XCTAssertEqual(ImportExport.exportVersion, "2.1.0")
        XCTAssertTrue(doc.cards[0].customLogoUri?.hasPrefix("data:image/jpeg;base64,") == true)

        let encoded = try ImportExport.encode(doc)
        let parsed = try ImportExport.parse(encoded, logos: logos)
        XCTAssertEqual(parsed.cards[0].name, "Demo Market")
        XCTAssertNotEqual(parsed.cards[0].customLogoUri, "mark.jpg")
        XCTAssertFalse(parsed.cards[0].customLogoUri?.contains("/") == true)
    }

    func testInvalidExport() {
        let logos = CustomLogoStore(directory: FileManager.default.temporaryDirectory)
        XCTAssertThrowsError(try ImportExport.parse(Data("{}".utf8), logos: logos)) { error in
            XCTAssertEqual(error as? TesseroneError, .missingCardsArray)
        }
        XCTAssertThrowsError(try ImportExport.parse(Data("[]".utf8), logos: logos)) { error in
            XCTAssertEqual(error as? TesseroneError, .invalidExport)
        }
    }

    private func sampleCard(
        id: String,
        updatedAt: String,
        name: String,
        customLogoUri: String? = nil
    ) -> FidelityCard {
        FidelityCard(
            id: id,
            name: name,
            code: "4006381333931",
            format: .ean13,
            customLogoUri: customLogoUri,
            sortIndex: 0,
            createdAt: "2026-06-17T09:30:00.000Z",
            updatedAt: updatedAt
        )
    }
}
