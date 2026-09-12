import Foundation

/// Wire contract with `src/types.ts` (`WATCH_SCHEMA_VERSION = 1`).
public let WATCH_SCHEMA_VERSION = 1
public let WIDGET_SCHEMA_VERSION = 1

/// Stable logo identity for a card, matching JS `logoTargetFor`.
public struct LogoTarget: Equatable, Hashable, Sendable {
    public var key: String
    public var isCustom: Bool

    public init(key: String, isCustom: Bool) {
        self.key = key
        self.isCustom = isCustom
    }

    public var sanitizedFileName: String {
        key.replacingOccurrences(of: ":", with: "_")
    }
}

/// Snapshot card shared by WatchConnectivity and WidgetKit. JSON keys match
/// `WatchSnapshotCard` in `src/types.ts`.
public struct WatchSnapshotCard: Codable, Equatable, Hashable, Sendable, Identifiable {
    public var id: CardId
    public var name: String
    public var code: String
    public var format: BarcodeFormat
    public var color: String?
    public var logoSlug: String?
    public var hasCustomLogo: Bool
    public var sortIndex: Int
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: CardId,
        name: String,
        code: String,
        format: BarcodeFormat,
        color: String? = nil,
        logoSlug: String? = nil,
        hasCustomLogo: Bool,
        sortIndex: Int,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.name = name
        self.code = code
        self.format = format
        self.color = color
        self.logoSlug = logoSlug
        self.hasCustomLogo = hasCustomLogo
        self.sortIndex = sortIndex
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public var logoKey: String? {
        if hasCustomLogo { return "custom:\(id)" }
        if let slug = logoSlug { return "bundled:\(slug)" }
        return nil
    }

    enum CodingKeys: String, CodingKey {
        case id, name, code, format, color, logoSlug, hasCustomLogo, sortIndex, createdAt, updatedAt
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(code, forKey: .code)
        try c.encode(format, forKey: .format)
        try c.encodeIfPresent(color, forKey: .color)
        try c.encodeIfPresent(logoSlug, forKey: .logoSlug)
        try c.encode(hasCustomLogo, forKey: .hasCustomLogo)
        try c.encode(sortIndex, forKey: .sortIndex)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encode(updatedAt, forKey: .updatedAt)
    }
}

public struct WatchSnapshot: Codable, Equatable, Sendable {
    public var schemaVersion: Int
    public var cards: [WatchSnapshotCard]
    public var sortMode: SortMode
    public var themeMode: ThemeMode

    public init(
        schemaVersion: Int = WATCH_SCHEMA_VERSION,
        cards: [WatchSnapshotCard],
        sortMode: SortMode,
        themeMode: ThemeMode
    ) {
        self.schemaVersion = schemaVersion
        self.cards = cards
        self.sortMode = sortMode
        self.themeMode = themeMode
    }
}

public struct WidgetSnapshot: Codable, Equatable, Sendable {
    public var schemaVersion: Int
    public var cards: [WatchSnapshotCard]

    public init(schemaVersion: Int = WIDGET_SCHEMA_VERSION, cards: [WatchSnapshotCard]) {
        self.schemaVersion = schemaVersion
        self.cards = cards
    }
}

public struct PendingScanPayload: Codable, Equatable, Sendable {
    public var code: String
    public var format: BarcodeFormat

    public init(code: String, format: BarcodeFormat) {
        self.code = code
        self.format = format
    }
}

/// Port of `src/services/cardSnapshot.ts`. Watch and widget syncs share this so
/// the off-device card shape cannot drift.
public enum CardSnapshot {
    public static func logoTarget(for card: FidelityCard) -> LogoTarget? {
        if CustomLogoRef.filename(from: card.customLogoUri) != nil {
            return LogoTarget(key: "custom:\(card.id)", isCustom: true)
        }
        if let slug = card.logoSlug, !slug.isEmpty {
            return LogoTarget(key: "bundled:\(slug)", isCustom: false)
        }
        return nil
    }

    public static func toSnapshotCard(_ card: FidelityCard) -> WatchSnapshotCard {
        WatchSnapshotCard(
            id: card.id,
            name: card.name,
            code: card.code,
            format: card.format,
            color: card.color,
            logoSlug: card.logoSlug,
            hasCustomLogo: CustomLogoRef.filename(from: card.customLogoUri) != nil,
            sortIndex: card.sortIndex,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt
        )
    }

    /// Sorted by id so serialized JSON is stable for change-detection.
    public static func buildWatchCards(_ cards: [CardId: FidelityCard]) -> [WatchSnapshotCard] {
        cards.values.sorted { $0.id < $1.id }.map(toSnapshotCard)
    }

    public static func buildWatchSnapshot(_ document: WalletDocument) -> WatchSnapshot {
        WatchSnapshot(
            schemaVersion: WATCH_SCHEMA_VERSION,
            cards: buildWatchCards(document.cards),
            sortMode: document.settings.sortMode,
            themeMode: document.settings.themeMode
        )
    }

    /// Display order; `color` is the resolved effective background (the widget
    /// process cannot read brand-index.json).
    public static func buildWidgetSnapshot(_ document: WalletDocument, brands: BrandIndex?) -> WidgetSnapshot {
        let ordered = getSortedCards(document.cards, mode: document.settings.sortMode)
        let cards = ordered.map { card -> WatchSnapshotCard in
            var snap = toSnapshotCard(card)
            snap.color = CardAppearance.resolveColor(card, brands: brands)
            return snap
        }
        return WidgetSnapshot(schemaVersion: WIDGET_SCHEMA_VERSION, cards: cards)
    }

    public static func dictionary(from snapshot: WatchSnapshot) throws -> [String: Any] {
        let data = try JSONEncoder().encode(snapshot)
        let object = try JSONSerialization.jsonObject(with: data)
        guard let dict = object as? [String: Any] else {
            throw TesseroneError.malformedJSON
        }
        return dict
    }

    public static func jsonString(from snapshot: WidgetSnapshot) throws -> String {
        let data = try JSONEncoder().encode(snapshot)
        guard let json = String(data: data, encoding: .utf8) else {
            throw TesseroneError.malformedJSON
        }
        return json
    }

    public static func bundledLogoURL(named filename: String, bundle: Bundle = .main) -> URL? {
        let name = (filename as NSString).deletingPathExtension
        let ext = (filename as NSString).pathExtension
        return bundle.url(forResource: name, withExtension: ext, subdirectory: "brands/logos")
            ?? bundle.url(forResource: name, withExtension: ext, subdirectory: "logos")
            ?? bundle.url(forResource: name, withExtension: ext)
    }

    public static func logoFileURL(
        for card: FidelityCard,
        brands: BrandIndex?,
        customLogos: CustomLogoStore,
        bundle: Bundle = .main
    ) -> URL? {
        if let url = customLogos.fileURL(for: card.customLogoUri),
           FileManager.default.fileExists(atPath: url.path) {
            return url
        }
        guard let slug = card.logoSlug, let file = brands?.brand(slug: slug)?.logo else { return nil }
        let url = bundledLogoURL(named: file, bundle: bundle)
        if let url, FileManager.default.fileExists(atPath: url.path) { return url }
        return url
    }

    public static func sanitizeLogoKey(_ key: String) -> String {
        key.replacingOccurrences(of: ":", with: "_")
    }
}

public enum PendingScanStore {
    public static func load(fileManager: FileManager = .default) -> PendingScanPayload? {
        let url = StorePaths.pendingScanURL(fileManager: fileManager)
        guard fileManager.fileExists(atPath: url.path),
              let data = try? Data(contentsOf: url),
              let payload = try? JSONDecoder().decode(PendingScanPayload.self, from: data)
        else { return nil }
        return payload
    }

    public static func write(_ payload: PendingScanPayload, fileManager: FileManager = .default) throws {
        let url = StorePaths.pendingScanURL(fileManager: fileManager)
        try fileManager.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(payload)
        try data.write(to: url, options: .atomic)
    }

    public static func clear(fileManager: FileManager = .default) {
        let url = StorePaths.pendingScanURL(fileManager: fileManager)
        guard fileManager.fileExists(atPath: url.path) else { return }
        try? fileManager.removeItem(at: url)
    }
}
