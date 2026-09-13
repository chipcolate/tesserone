import Combine
import Foundation

final class LogoCache: ObservableObject {
    private let dir: URL = {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let logos = docs.appendingPathComponent("logos", isDirectory: true)
        try? FileManager.default.createDirectory(at: logos, withIntermediateDirectories: true)
        return logos
    }()

    func url(for logoKey: String) -> URL? {
        let path = dir.appendingPathComponent(safeName(for: logoKey))
        return FileManager.default.fileExists(atPath: path.path) ? path : nil
    }

    func ingest(file: URL, logoKey: String) {
        let dest = dir.appendingPathComponent(safeName(for: logoKey))
        try? FileManager.default.removeItem(at: dest)
        do {
            try FileManager.default.moveItem(at: file, to: dest)
            DispatchQueue.main.async { [weak self] in
                self?.objectWillChange.send()
            }
        } catch {
            NSLog("[TesseroneWatch] logo ingest failed for %@: %@",
                  logoKey, error.localizedDescription)
        }
    }

    private func safeName(for logoKey: String) -> String {
        logoKey.replacingOccurrences(of: ":", with: "_")
    }
}
