import Foundation
import XCTest
@testable import TesseroneKit

final class CardSnapshotTests: XCTestCase {
    func testWatchSnapshotJSONMatchesTypesContract() throws {
        let card = FidelityCard(
            id: "card-001",
            name: "Demo Market",
            code: "4006381333931",
            format: .ean13,
            color: "#42A5F5",
            logoSlug: "essalunga",
            customLogoUri: nil,
            sortIndex: 0,
            createdAt: "2026-06-17T09:30:00.000Z",
            updatedAt: "2026-06-17T09:30:00.000Z"
        )
        let doc = WalletDocument(
            cards: [card.id: card],
            settings: Settings(themeMode: .system, sortMode: .manual, language: .system)
        )
        let snap = CardSnapshot.buildWatchSnapshot(doc)
        XCTAssertEqual(snap.schemaVersion, 1)
        XCTAssertEqual(WATCH_SCHEMA_VERSION, 1)
        XCTAssertEqual(snap.cards.count, 1)
        XCTAssertEqual(snap.cards[0].format, .ean13)
        XCTAssertEqual(snap.cards[0].hasCustomLogo, false)
        XCTAssertEqual(snap.cards[0].logoKey, "bundled:essalunga")

        let dict = try CardSnapshot.dictionary(from: snap)
        XCTAssertEqual(dict["schemaVersion"] as? Int, 1)
        XCTAssertEqual(dict["sortMode"] as? String, "manual")
        XCTAssertEqual(dict["themeMode"] as? String, "system")
        let cards = try XCTUnwrap(dict["cards"] as? [[String: Any]])
        XCTAssertEqual(cards[0]["format"] as? String, "EAN13")
        XCTAssertEqual(cards[0]["hasCustomLogo"] as? Bool, false)
        XCTAssertEqual(cards[0]["id"] as? String, "card-001")
    }

    func testWatchCardsSortedByIdAndCustomLogoKey() {
        let a = FidelityCard(
            id: "b-card",
            name: "B",
            code: "1",
            format: .qr,
            customLogoUri: "123-abcd.jpg",
            sortIndex: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z"
        )
        let b = FidelityCard(
            id: "a-card",
            name: "A",
            code: "2",
            format: .code128,
            logoSlug: "lidl",
            sortIndex: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        )
        let cards = CardSnapshot.buildWatchCards([a.id: a, b.id: b])
        XCTAssertEqual(cards.map(\.id), ["a-card", "b-card"])
        XCTAssertEqual(cards[0].logoKey, "bundled:lidl")
        XCTAssertEqual(cards[1].logoKey, "custom:b-card")
        XCTAssertEqual(cards[1].hasCustomLogo, true)
        XCTAssertEqual(CardSnapshot.logoTarget(for: a)?.key, "custom:b-card")
    }

    func testWidgetSnapshotResolvesColorAndDisplayOrder() {
        let first = FidelityCard(
            id: "z",
            name: "Zed",
            code: "1",
            format: .ean13,
            sortIndex: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        )
        let second = FidelityCard(
            id: "a",
            name: "Alpha",
            code: "2",
            format: .ean13,
            color: "#EF5350",
            sortIndex: 1,
            createdAt: "2026-01-02T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z"
        )
        let doc = WalletDocument(
            cards: [first.id: first, second.id: second],
            settings: Settings(sortMode: .manual)
        )
        let snap = CardSnapshot.buildWidgetSnapshot(doc, brands: nil)
        XCTAssertEqual(snap.schemaVersion, 1)
        XCTAssertEqual(snap.cards.map(\.id), ["z", "a"])
        XCTAssertEqual(snap.cards[0].color, CardAppearance.fallbackBackground)
        XCTAssertEqual(snap.cards[1].color, "#EF5350")
    }

    func testPendingScanRoundTrip() throws {
        let dir = try Fixtures.makeTempDir()
        defer { try? FileManager.default.removeItem(at: dir) }

        let url = dir.appendingPathComponent("pending-scan.json")
        let payload = PendingScanPayload(code: "4006381333931", format: .ean13)
        let data = try JSONEncoder().encode(payload)
        try data.write(to: url)

        let decoded = try JSONDecoder().decode(PendingScanPayload.self, from: data)
        XCTAssertEqual(decoded.code, "4006381333931")
        XCTAssertEqual(decoded.format, .ean13)

        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        XCTAssertEqual(object?["code"] as? String, "4006381333931")
        XCTAssertEqual(object?["format"] as? String, "EAN13")
    }

    func testQRModulesHaveFinderPattern() throws {
        let matrix = try XCTUnwrap(Barcode.qrModules("HELLO"))
        XCTAssertEqual(matrix.count, matrix.first?.count)
        XCTAssertGreaterThanOrEqual(matrix.count, 21)
        // Top-left finder: 7×7 dark/light ring.
        XCTAssertEqual(Array(matrix[0].prefix(7)), [true, true, true, true, true, true, true])
        XCTAssertEqual(Array(matrix[1].prefix(7)), [true, false, false, false, false, false, true])
        XCTAssertEqual(Array(matrix[2].prefix(7)), [true, false, true, true, true, false, true])
        XCTAssertNil(Barcode.qrModules(""))
        XCTAssertNil(Barcode.qrModules("   "))
    }
}
