import Foundation
@testable import TesseroneKit

enum Fixtures {
    static func url(_ name: String) -> URL {
        let bundle = Bundle.module.url(
            forResource: name,
            withExtension: "json",
            subdirectory: "Fixtures"
        )
        if let bundle { return bundle }
        // Fallback when resources are not copied (e.g. unsandboxed `swift test` oddities).
        return URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("\(name).json")
    }

    static func data(_ name: String) throws -> Data {
        try Data(contentsOf: url(name))
    }

    static func string(_ name: String) throws -> String {
        try String(contentsOf: url(name), encoding: .utf8)
    }

    static func jsonObject(_ name: String) throws -> Any {
        try JSONSerialization.jsonObject(with: data(name))
    }

    static func makeTempDir() throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("tesserone-tests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }
}
