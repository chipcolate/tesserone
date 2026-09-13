import Foundation
import TesseroneKit
import UIKit

/// Reads the snapshot + logo images the app writes into the shared App Group.
enum SharedStore {
    static let appGroup = StorePaths.appGroupId

    private static var widgetsDir: URL? {
        StorePaths.widgetsRoot()
    }

    static func loadSnapshot() -> WidgetSnapshot? {
        guard let url = StorePaths.widgetSnapshotURL(),
              let data = try? Data(contentsOf: url),
              let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else { return nil }
        return snap
    }

    static func cards() -> [WatchSnapshotCard] {
        loadSnapshot()?.cards ?? []
    }

    static func card(id: String) -> WatchSnapshotCard? {
        cards().first { $0.id == id }
    }

    private static let imageCache = NSCache<NSString, UIImage>()

    static func logoImage(for card: WatchSnapshotCard) -> UIImage? {
        guard let key = card.logoKey,
              let dir = StorePaths.widgetLogosRoot()
        else { return nil }
        let cacheKey = "\(key)#\(card.updatedAt)" as NSString
        if let cached = imageCache.object(forKey: cacheKey) { return cached }
        let file = dir.appendingPathComponent(CardSnapshot.sanitizeLogoKey(key) + ".png")
        guard let image = UIImage(contentsOfFile: file.path) else { return nil }
        imageCache.setObject(image, forKey: cacheKey)
        return image
    }

    /// Deep link that opens the app and expands this card to its barcode.
    static func openURL(for card: WatchSnapshotCard) -> URL? {
        URL(string: "tesserone://open/\(card.id)")
    }
}
