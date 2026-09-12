import Foundation
import XCTest
@testable import TesseroneKit

final class BarcodeEncodeTests: XCTestCase {
    func testEAN13FromNativeOneCardFixtureIsEncodable() throws {
        let doc = try JSONDecoder().decode(WalletDocument.self, from: try Fixtures.data("native-one-card"))
        let card = try XCTUnwrap(doc.cards["card-001"])
        XCTAssertEqual(card.format, .ean13)
        XCTAssertEqual(card.code, "4006381333931")

        let pattern = EAN.encodeEAN13(card.code)
        XCTAssertNotNil(pattern)
        XCTAssertEqual(pattern, Barcode.linearModules(card.code, format: .ean13))
        XCTAssertEqual(try XCTUnwrap(pattern).count, 95)
        XCTAssertTrue(try XCTUnwrap(pattern).contains(true))
        XCTAssertTrue(try XCTUnwrap(pattern).contains(false))
    }

    func testEAN13RejectsBadChecksum() {
        XCTAssertNil(EAN.encodeEAN13("4006381333932"))
        XCTAssertNil(Barcode.linearModules("not-a-barcode", format: .ean13))
    }

    func testCode128AndCode39Encode() {
        XCTAssertNotNil(Code128.encode("ABC-123"))
        XCTAssertNotNil(Code39.encode("ABC-123"))
        XCTAssertNil(Code128.encode("é"))
    }
}
