import Foundation

/// Bare-filename handling for `FidelityCard.customLogoUri`.
/// Native JSON never stores a `file://` or data URI.
public enum CustomLogoRef {
    /// `/custom-logos/<name>` at the end of a path or `file://` URI.
    private static let legacyURIPattern = #"\/custom-logos\/([^/?#]+)$"#

    public static func filename(from stored: String?) -> String? {
        guard let stored, !stored.isEmpty else { return nil }
        if stored.contains("/") {
            guard let regex = try? NSRegularExpression(pattern: legacyURIPattern) else { return nil }
            let range = NSRange(stored.startIndex..<stored.endIndex, in: stored)
            guard let match = regex.firstMatch(in: stored, range: range),
                  match.numberOfRanges >= 2,
                  let nameRange = Range(match.range(at: 1), in: stored)
            else { return nil }
            let name = String(stored[nameRange])
            return name.isEmpty ? nil : name
        }
        if stored.contains("..") { return nil }
        return stored
    }
}

public struct CustomLogoStore: @unchecked Sendable {
    public let directory: URL

    public init(directory: URL) {
        self.directory = directory
    }

    public func filename(from stored: String?) -> String? {
        CustomLogoRef.filename(from: stored)
    }

    public func fileURL(for stored: String?) -> URL? {
        guard let name = CustomLogoRef.filename(from: stored) else { return nil }
        return directory.appendingPathComponent(name)
    }

    public func ensureDirectory() throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    public func write(data: Data) throws -> String {
        try ensureDirectory()
        let filename = newFilename()
        try data.write(to: directory.appendingPathComponent(filename), options: .atomic)
        return filename
    }

    public func remove(_ stored: String?) {
        guard let url = fileURL(for: stored) else { return }
        guard FileManager.default.fileExists(atPath: url.path) else { return }
        try? FileManager.default.removeItem(at: url)
    }

    public func writeFromDataURI(_ dataURI: String) -> String? {
        guard let match = dataURI.range(of: #"^data:image\/[a-zA-Z0-9+.-]+;base64,(.*)$"#, options: .regularExpression)
        else { return nil }
        let payload = String(dataURI[match])
        guard let comma = payload.firstIndex(of: ",") else { return nil }
        let b64 = String(payload[payload.index(after: comma)...])
        guard let data = Data(base64Encoded: b64, options: [.ignoreUnknownCharacters]) else { return nil }
        do {
            try ensureDirectory()
            let filename = newFilename()
            let url = directory.appendingPathComponent(filename)
            try data.write(to: url, options: .atomic)
            return filename
        } catch {
            return nil
        }
    }

    public func dataURI(from stored: String) -> String? {
        guard let url = fileURL(for: stored) else { return nil }
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        guard let data = try? Data(contentsOf: url) else { return nil }
        return "data:image/jpeg;base64,\(data.base64EncodedString())"
    }

    public func copyAll(from source: URL) throws {
        let fm = FileManager.default
        var isDir: Bool = false
        guard fm.fileExists(atPath: source.path) else { return }
        if let values = try? source.resourceValues(forKeys: [.isDirectoryKey]) {
            isDir = values.isDirectory ?? false
        }
        guard isDir else { return }
        try ensureDirectory()
        let items = try fm.contentsOfDirectory(
            at: source,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        )
        for item in items {
            if item.hasDirectoryPath { continue }
            if let values = try? item.resourceValues(forKeys: [.isDirectoryKey]), values.isDirectory == true {
                continue
            }
            let dest = directory.appendingPathComponent(item.lastPathComponent)
            if fm.fileExists(atPath: dest.path) {
                try fm.removeItem(at: dest)
            }
            try fm.copyItem(at: item, to: dest)
        }
    }

    private func newFilename() -> String {
        let ms = Int(Date().timeIntervalSince1970 * 1000)
        let rand = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(8)).lowercased()
        return "\(ms)-\(rand).jpg"
    }
}
