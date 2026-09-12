import Foundation
import XCTest
@testable import TesseroneKit

final class BarcodeTests: XCTestCase {
    func testValidateKnownFormats() {
        XCTAssertTrue(Barcode.validate("4006381333931", format: .ean13))
        XCTAssertFalse(Barcode.validate("400638133393", format: .ean13))
        XCTAssertTrue(Barcode.validate("12345678", format: .ean8))
        XCTAssertTrue(Barcode.validate("123456789012", format: .upcA))
        XCTAssertTrue(Barcode.validate("123456", format: .upcE))
        XCTAssertTrue(Barcode.validate("12345678", format: .upcE))
        XCTAssertFalse(Barcode.validate("12345", format: .upcE))
        XCTAssertTrue(Barcode.validate("ABC", format: .code128))
        XCTAssertFalse(Barcode.validate("   ", format: .code128))
        XCTAssertTrue(Barcode.validate("anything", format: .qr))
        XCTAssertFalse(Barcode.validate("", format: .qr))
    }

    func testFixScannedCodePrependsZeroFor12DigitEAN13() {
        let fixed = Barcode.fixScannedCode("123456789012", format: .ean13)
        XCTAssertEqual(fixed.code, "0123456789012")
        XCTAssertEqual(fixed.format, .ean13)

        let already = Barcode.fixScannedCode("4006381333931", format: .ean13)
        XCTAssertEqual(already.code, "4006381333931")
    }
}
