import Foundation
import UIKit

/// A card as written by the JS widget sync service (`src/services/widgets.ts`)
/// into the App Group container. Mirrors `WatchSnapshotCard` minus the bits the
/// widget doesn't need; `color` is already the resolved effective background.
struct WidgetCard: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let code: String
    let format: String
    let color: String?
    let logoSlug: String?
    let hasCustomLogo: Bool
    let sortIndex: Int
    let createdAt: String
    let updatedAt: String

    /// Stable logo identity, matching the JS `logoTargetFor` keys.
    var logoKey: String? {
        if hasCustomLogo { return "custom:\(id)" }
        if let slug = logoSlug { return "bundled:\(slug)" }
        return nil
    }
}

struct WidgetSnapshot: Codable {
    let schemaVersion: Int
    let cards: [WidgetCard]
}

/// Reads the snapshot + logo images the app writes into the shared App Group.
enum SharedStore {
    static let appGroup = "group.com.chipcolate.tesserone"

    private static var widgetsDir: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
            .appendingPathComponent("widgets", isDirectory: true)
    }

    static func loadSnapshot() -> WidgetSnapshot? {
        guard let url = widgetsDir?.appendingPathComponent("snapshot.json"),
              let data = try? Data(contentsOf: url),
              let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else { return nil }
        return snap
    }

    static func cards() -> [WidgetCard] {
        loadSnapshot()?.cards ?? []
    }

    static func card(id: String) -> WidgetCard? {
        cards().first { $0.id == id }
    }

    private static let imageCache = NSCache<NSString, UIImage>()

    static func logoImage(for card: WidgetCard) -> UIImage? {
        guard let key = card.logoKey,
              let dir = widgetsDir?.appendingPathComponent("logos", isDirectory: true)
        else { return nil }
        // SwiftUI re-evaluates the card views' `body` frequently; decode each
        // logo once and cache it (keyed by identity + updatedAt so a logo change
        // busts the entry) instead of re-reading the PNG from disk every time.
        let cacheKey = "\(key)#\(card.updatedAt)" as NSString
        if let cached = imageCache.object(forKey: cacheKey) { return cached }
        let file = dir.appendingPathComponent(sanitize(key) + ".png")
        guard let image = UIImage(contentsOfFile: file.path) else { return nil }
        imageCache.setObject(image, forKey: cacheKey)
        return image
    }

    /// Deep link that opens the app and expands this card to its barcode.
    static func openURL(for card: WidgetCard) -> URL? {
        URL(string: "tesserone://open/\(card.id)")
    }

    private static func sanitize(_ key: String) -> String {
        key.replacingOccurrences(of: ":", with: "_")
    }
}
