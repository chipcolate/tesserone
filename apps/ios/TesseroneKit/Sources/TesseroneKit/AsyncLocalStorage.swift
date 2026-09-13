import Foundation

/// Zustand persist envelope: `{ "state": T, "version": N }`.
public struct ZustandEnvelope<State: Decodable>: Decodable {
    public var state: State
    public var version: Int
}

public enum ZustandPersist {
    public static func unwrap<State: Decodable>(_ data: Data, as type: State.Type = State.self) throws -> ZustandEnvelope<State> {
        try JSONDecoder().decode(ZustandEnvelope<State>.self, from: data)
    }

    public static func unwrap<State: Decodable>(_ string: String, as type: State.Type = State.self) throws -> ZustandEnvelope<State> {
        guard let data = string.data(using: .utf8) else { throw TesseroneError.malformedJSON }
        return try unwrap(data, as: type)
    }

    /// Returns the `state` object and persist `version` from a JSON object, or nil if not an envelope.
    public static func unwrapJSON(_ object: Any) -> (state: Any, version: Int)? {
        guard let dict = object as? [String: Any], let state = dict["state"] else { return nil }
        let version = (dict["version"] as? Int) ?? (dict["version"] as? NSNumber)?.intValue ?? 0
        return (state, version)
    }
}

/// RCTAsyncLocalStorage_V1: `manifest.json` plus sidecar files named `md5(key)` when the value is JSON null.
public enum AsyncLocalStorage {
    public static let inlineValueThreshold = 1024

    public static func md5Hex(_ key: String) -> String {
        MD5.hex(key)
    }

    /// `md5("cards")` — documented in `shared/schema/README.md`.
    public static let cardsKeyDigest = "492e6640145b729207a5816b2fdb47f3"

    /// Reads `directory/manifest.json`. A JSON `null` value is loaded from `directory/<md5(key)>`.
    public static func readManifest(directory: URL) throws -> [String: String] {
        let manifestURL = directory.appendingPathComponent("manifest.json")
        let data = try Data(contentsOf: manifestURL)
        let parsed: Any
        do {
            parsed = try JSONSerialization.jsonObject(with: data)
        } catch {
            throw TesseroneError.malformedJSON
        }
        guard let object = parsed as? [String: Any] else { throw TesseroneError.malformedJSON }

        var result: [String: String] = [:]
        for (key, value) in object {
            if value is NSNull {
                let sidecar = directory.appendingPathComponent(md5Hex(key))
                result[key] = try String(contentsOf: sidecar, encoding: .utf8)
            } else if let string = value as? String {
                result[key] = string
            }
        }
        return result
    }
}

public enum ExpoStoragePaths {
    public static let bundleId = "com.chipcolate.tesserone"

    public static func asyncStorageDirectory(fileManager: FileManager = .default) -> URL {
        fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent(bundleId, isDirectory: true)
            .appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true)
    }

    public static func customLogosDirectory(fileManager: FileManager = .default) -> URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("custom-logos", isDirectory: true)
    }
}
