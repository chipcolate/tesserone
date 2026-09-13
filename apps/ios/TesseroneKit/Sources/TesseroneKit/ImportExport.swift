import Foundation

public enum MergeStrategy: String, Sendable, Equatable {
    case keepExisting
    case useImported
    case keepNewer
}

public struct PartialSettings: Codable, Equatable, Sendable {
    public var themeMode: ThemeMode?
    public var sortMode: SortMode?
    public var language: LanguagePreference?

    public init(themeMode: ThemeMode? = nil, sortMode: SortMode? = nil, language: LanguagePreference? = nil) {
        self.themeMode = themeMode
        self.sortMode = sortMode
        self.language = language
    }

    public func applying(to base: Settings) -> Settings {
        var next = base
        if let themeMode { next.themeMode = themeMode }
        if let sortMode { next.sortMode = sortMode }
        if let language { next.language = language }
        return next
    }
}

public struct ExportDocument: Codable, Equatable, Sendable {
    public var cards: [FidelityCard]
    public var settings: PartialSettings?
    public var exportedAt: String
    public var version: String

    public init(
        cards: [FidelityCard],
        settings: PartialSettings? = nil,
        exportedAt: String,
        version: String
    ) {
        self.cards = cards
        self.settings = settings
        self.exportedAt = exportedAt
        self.version = version
    }
}

public struct ImportResult: Equatable, Sendable {
    public var cards: [FidelityCard]
    public var settings: PartialSettings
    public var exportedAt: String
    public var version: String
}

public enum ImportExport {
    public static let exportVersion = "2.1.0"

    public static func makeExport(
        cards: [FidelityCard],
        settings: Settings?,
        logos: CustomLogoStore,
        exportedAt: String = ISODate.now()
    ) -> ExportDocument {
        let inlined = inlineLogos(cards, logos: logos)
        let partial: PartialSettings? = settings.map {
            PartialSettings(themeMode: $0.themeMode, sortMode: $0.sortMode, language: $0.language)
        }
        return ExportDocument(
            cards: inlined,
            settings: partial,
            exportedAt: exportedAt,
            version: exportVersion
        )
    }

    /// One-card share-out: same 2.1.0 envelope, no settings blob.
    public static func makeCardShare(
        card: FidelityCard,
        logos: CustomLogoStore,
        exportedAt: String = ISODate.now()
    ) -> ExportDocument {
        makeExport(cards: [card], settings: nil, logos: logos, exportedAt: exportedAt)
    }

    public static func inlineLogos(_ cards: [FidelityCard], logos: CustomLogoStore) -> [FidelityCard] {
        cards.map { card in
            var copy = card
            if let stored = card.customLogoUri, let uri = logos.dataURI(from: stored) {
                copy.customLogoUri = uri
            }
            return copy
        }
    }

    public static func encode(_ document: ExportDocument) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(document)
    }

    public static func parse(_ data: Data, logos: CustomLogoStore, now: String = ISODate.now()) throws -> ImportResult {
        let object: Any
        do {
            object = try JSONSerialization.jsonObject(with: data)
        } catch {
            throw TesseroneError.invalidExport
        }
        guard let dict = object as? [String: Any] else { throw TesseroneError.invalidExport }
        guard let rawCards = dict["cards"] as? [Any] else { throw TesseroneError.missingCardsArray }

        var migrated: [FidelityCard] = []
        migrated.reserveCapacity(rawCards.count)
        for (index, item) in rawCards.enumerated() {
            guard let cardObj = item as? [String: Any],
                  let id = cardObj["id"] as? String,
                  let name = cardObj["name"] as? String,
                  let code = cardObj["code"] as? String,
                  let format = cardObj["format"] as? String
            else { throw TesseroneError.invalidCard }
            let raw = RawImportedCard(
                id: id,
                name: name,
                code: code,
                format: format,
                color: cardObj["color"] as? String,
                logoSlug: cardObj["logoSlug"] as? String,
                customLogoUri: cardObj["customLogoUri"] as? String,
                notes: cardObj["notes"] as? String,
                sortIndex: jsonInt(cardObj["sortIndex"]),
                createdAt: cardObj["createdAt"] as? String,
                updatedAt: cardObj["updatedAt"] as? String
            )
            migrated.append(CardNormalization.card(from: raw, index: index, now: now, logos: logos))
        }

        return ImportResult(
            cards: migrated,
            settings: narrowSettings(dict["settings"]),
            exportedAt: (dict["exportedAt"] as? String) ?? now,
            version: (dict["version"] as? String) ?? "1.0.0"
        )
    }

    public static func detectConflicts(
        existing: [CardId: FidelityCard],
        imported: [FidelityCard]
    ) -> Int {
        imported.filter { existing[$0.id] != nil }.count
    }

    public static func mergeCards(
        existing: [CardId: FidelityCard],
        imported: [FidelityCard],
        strategy: MergeStrategy = .keepNewer
    ) -> [CardId: FidelityCard] {
        var result = existing
        for card in imported {
            guard let current = result[card.id] else {
                result[card.id] = card
                continue
            }
            switch strategy {
            case .keepExisting:
                break
            case .useImported:
                result[card.id] = card
            case .keepNewer:
                if isNewer(card.updatedAt, than: current.updatedAt) {
                    result[card.id] = card
                }
            }
        }
        return result
    }

    private static func isNewer(_ a: String, than b: String) -> Bool {
        if let da = ISODate.date(from: a), let db = ISODate.date(from: b) {
            return da > db
        }
        return a > b
    }

    private static func jsonInt(_ value: Any?) -> Int? {
        if let i = value as? Int { return i }
        if let n = value as? NSNumber { return n.intValue }
        if let d = value as? Double { return Int(d) }
        if let s = value as? String { return Int(s) }
        return nil
    }

    private static func narrowSettings(_ value: Any?) -> PartialSettings {
        guard let dict = value as? [String: Any] else { return PartialSettings() }
        var out = PartialSettings()
        if let raw = dict["themeMode"] as? String, let mode = ThemeMode(rawValue: raw) {
            out.themeMode = mode
        }
        if let raw = dict["sortMode"] as? String, let mode = SortMode(rawValue: raw) {
            out.sortMode = mode
        }
        if let raw = dict["language"] as? String, let language = LanguagePreference(rawValue: raw) {
            out.language = language
        }
        return out
    }
}
