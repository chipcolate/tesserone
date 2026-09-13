import Foundation
import XCTest
@testable import TesseroneKit

final class WalletStoreTests: XCTestCase {
    func testLoadNativeOneCardFixture() throws {
        let doc = try JSONDecoder().decode(WalletDocument.self, from: try Fixtures.data("native-one-card"))
        XCTAssertEqual(doc.cards.count, 1)
        XCTAssertEqual(doc.cards["card-001"]?.format, .ean13)
        XCTAssertEqual(getSortedCards(doc.cards, mode: .manual).first?.id, "card-001")
        XCTAssertEqual(nextSortIndex(doc.cards), 1)
        XCTAssertEqual(nextSortIndex([:]), 0)
    }

    func testCRUDAndAtomicSave() async throws {
        let dir = try Fixtures.makeTempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let store = WalletStore(rootURL: dir)
        try await store.load()

        let card = FidelityCard(
            id: "a",
            name: "Alpha",
            code: "4006381333931",
            format: .ean13,
            sortIndex: 0,
            createdAt: "2026-06-17T09:30:00.000Z",
            updatedAt: "2026-06-17T09:30:00.000Z"
        )
        try await store.addCard(card)
        XCTAssertTrue(FileManager.default.fileExists(atPath: dir.appendingPathComponent("wallet.json").path))

        try await store.updateCard(id: "a") { $0.notes = "family" }
        var snap = await store.snapshot()
        XCTAssertEqual(snap.cards["a"]?.notes, "family")
        XCTAssertNotEqual(snap.cards["a"]?.updatedAt, "2026-06-17T09:30:00.000Z")

        let beta = FidelityCard(
            id: "b",
            name: "Beta",
            code: "123",
            format: .code128,
            sortIndex: 1,
            createdAt: "2026-06-18T00:00:00.000Z",
            updatedAt: "2026-06-18T00:00:00.000Z"
        )
        try await store.addCard(beta)
        try await store.reorderCard(id: "b", to: 0)
        snap = await store.snapshot()
        XCTAssertEqual(snap.cards["b"]?.sortIndex, 0)
        XCTAssertEqual(snap.cards["a"]?.sortIndex, 1)

        let alphabetical = await store.getSortedCards(mode: .alphabetical)
        XCTAssertEqual(alphabetical.map(\.name), ["Alpha", "Beta"])

        try await store.removeCard(id: "a")
        snap = await store.snapshot()
        XCTAssertNil(snap.cards["a"])
        XCTAssertEqual(snap.cards.count, 1)

        let reloaded = WalletStore(rootURL: dir)
        try await reloaded.load()
        let again = await reloaded.snapshot()
        XCTAssertEqual(again.cards.count, 1)
        XCTAssertEqual(again.cards["b"]?.name, "Beta")
    }

    func testSortModes() {
        let a = FidelityCard(
            id: "a", name: "Zed", code: "1", format: .qr,
            sortIndex: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z"
        )
        let b = FidelityCard(
            id: "b", name: "Amy", code: "2", format: .qr,
            sortIndex: 0,
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-01-15T00:00:00.000Z"
        )
        let cards = ["a": a, "b": b]
        XCTAssertEqual(getSortedCards(cards, mode: .manual).map(\.id), ["b", "a"])
        XCTAssertEqual(getSortedCards(cards, mode: .alphabetical).map(\.id), ["b", "a"])
        XCTAssertEqual(getSortedCards(cards, mode: .dateCreated).map(\.id), ["b", "a"])
        XCTAssertEqual(getSortedCards(cards, mode: .dateModified).map(\.id), ["a", "b"])
    }
}
