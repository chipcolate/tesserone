import Foundation
import XCTest
@testable import TesseroneKit

final class BrandIndexTests: XCTestCase {
    func testSearchIsCaseInsensitiveContainsOnNameAndAliases() throws {
        let json = """
        [
          {
            "slug": "esselunga",
            "name": "Esselunga",
            "aliases": ["esselunga"],
            "alt": "Esselunga supermarket logo",
            "primaryColor": "#00205b",
            "secondaryColor": "#e30613",
            "logo": "esselunga.png"
          },
          {
            "slug": "lidl",
            "name": "Lidl",
            "aliases": ["lidl", "lidl italia"],
            "alt": "Lidl logo",
            "primaryColor": "#0050AA",
            "secondaryColor": "#FFED00",
            "logo": "lidl.png"
          }
        ]
        """.data(using: .utf8)!
        let index = try BrandIndex(data: json)
        XCTAssertEqual(index.search("").count, 2)
        XCTAssertEqual(index.search("ESSE").map(\.slug), ["esselunga"])
        XCTAssertEqual(index.search("lidl italia").map(\.slug), ["lidl"])
        XCTAssertTrue(index.search("nope").isEmpty)
        XCTAssertEqual(index.brand(slug: "lidl")?.name, "Lidl")
    }
}
