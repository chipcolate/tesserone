import Foundation
import XCTest
@testable import TesseroneKit

final class L10nTests: XCTestCase {
    func testNestedKeyInterpolationAndPlurals() throws {
        let json = """
        {
          "add": {
            "invalidBarcodeBody": "The code doesn't match the {{format}} format.",
            "methodScanTitle": "Scan barcode"
          },
          "home": {
            "cardCount_one": "{{count}} card",
            "cardCount_other": "{{count}} cards"
          },
          "card": {
            "deletedToast": "Deleted {{name}}"
          }
        }
        """.data(using: .utf8)!
        let l10n = try L10n(language: "en", json: json)

        XCTAssertEqual(l10n.t("add.methodScanTitle"), "Scan barcode")
        XCTAssertEqual(
            l10n.t("add.invalidBarcodeBody", ["format": "EAN13"]),
            "The code doesn't match the EAN13 format."
        )
        XCTAssertEqual(l10n.t("card.deletedToast", ["name": "IKEA"]), "Deleted IKEA")
        XCTAssertEqual(l10n.t("home.cardCount", count: 1), "1 card")
        XCTAssertEqual(l10n.t("home.cardCount", count: 0), "0 cards")
        XCTAssertEqual(l10n.t("home.cardCount", count: 3), "3 cards")
        XCTAssertEqual(l10n.t("missing.key"), "missing.key")
    }

    func testResolveLanguageFromSettingsAndPreferredLanguages() {
        XCTAssertEqual(L10n.resolveLanguage(.it, preferredLanguages: ["en-US"]), "it")
        XCTAssertEqual(L10n.resolveLanguage(.system, preferredLanguages: ["fr-FR", "en"]), "fr")
        XCTAssertEqual(L10n.resolveLanguage(.system, preferredLanguages: ["es-MX"]), "es")
        XCTAssertEqual(L10n.resolveLanguage(.system, preferredLanguages: ["de_DE"]), "de")
        XCTAssertEqual(L10n.resolveLanguage(.system, preferredLanguages: ["ja-JP", "en-GB"]), "en")
        XCTAssertEqual(L10n.resolveLanguage(.system, preferredLanguages: ["zh-Hans", "ja"]), "en")
        XCTAssertEqual(L10n.resolveLanguage(.en, preferredLanguages: ["it-IT"]), "en")
    }
}
