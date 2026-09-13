import Foundation

public typealias CardId = String

public enum BarcodeFormat: String, Codable, CaseIterable, Sendable, Equatable, Hashable {
    case qr = "QR"
    case ean13 = "EAN13"
    case ean8 = "EAN8"
    case code128 = "CODE128"
    case code39 = "CODE39"
    case upcA = "UPCA"
    case upcE = "UPCE"
    case pdf417 = "PDF417"
    case aztec = "AZTEC"
    case dataMatrix = "DATAMATRIX"
    case itf14 = "ITF14"

    /// Import / migrator aliases from `src/services/importExport.ts` plus scanner types.
    public static func normalize(_ input: String) -> BarcodeFormat {
        if let exact = BarcodeFormat(rawValue: input) { return exact }
        if let mapped = aliases[input] { return mapped }
        if let mapped = aliases[input.lowercased()] { return mapped }
        if let exact = BarcodeFormat(rawValue: input.uppercased()) { return exact }
        return .code128
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = BarcodeFormat.normalize(raw)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    private static let aliases: [String: BarcodeFormat] = [
        "qr": .qr,
        "ean13": .ean13,
        "ean8": .ean8,
        "code128": .code128,
        "code39": .code39,
        "upcA": .upcA,
        "upcE": .upcE,
        "upca": .upcA,
        "upce": .upcE,
        "upc_a": .upcA,
        "upc_e": .upcE,
        "pdf417": .pdf417,
        "aztec": .aztec,
        "datamatrix": .dataMatrix,
        "itf": .itf14,
        "itf14": .itf14,
        "unknown": .code128,
    ]
}

public struct BarcodeFormatOption: Equatable, Sendable, Hashable {
    public var value: BarcodeFormat
    public var label: String

    public init(value: BarcodeFormat, label: String) {
        self.value = value
        self.label = label
    }
}

public enum SortMode: String, Codable, CaseIterable, Sendable, Hashable {
    case manual
    case alphabetical
    case dateCreated
    case dateModified
}

public enum ThemeMode: String, Codable, CaseIterable, Sendable, Hashable {
    case system
    case light
    case dark
}

public enum LanguagePreference: String, Codable, CaseIterable, Sendable, Hashable {
    case system
    case en
    case it
    case fr
    case es
    case de
}

public enum TutorialStepId: String, Codable, CaseIterable, Sendable, Hashable {
    case homeAddFirst = "home-add-first"
    case homeTapExpand = "home-tap-expand"
    case expandedTips = "expanded-tips"
    case homeScroll = "home-scroll"
    case homeShareTip = "home-share-tip"
    case homeReorderHint = "home-reorder-hint"
    case reorderDrag = "reorder-drag"
}

public struct FidelityCard: Codable, Equatable, Sendable, Identifiable {
    public var id: CardId
    public var name: String
    public var code: String
    public var format: BarcodeFormat
    public var color: String?
    public var logoSlug: String?
    public var customLogoUri: String?
    public var notes: String?
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
        customLogoUri: String? = nil,
        notes: String? = nil,
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
        self.customLogoUri = customLogoUri
        self.notes = notes
        self.sortIndex = sortIndex
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id, name, code, format, color, logoSlug, customLogoUri, notes, sortIndex, createdAt, updatedAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        code = try c.decode(String.self, forKey: .code)
        format = try c.decode(BarcodeFormat.self, forKey: .format)
        color = try c.decodeIfPresent(String.self, forKey: .color)
        logoSlug = try c.decodeIfPresent(String.self, forKey: .logoSlug)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        sortIndex = try c.decode(Int.self, forKey: .sortIndex)
        createdAt = try c.decode(String.self, forKey: .createdAt)
        updatedAt = try c.decode(String.self, forKey: .updatedAt)
        let stored = try c.decodeIfPresent(String.self, forKey: .customLogoUri)
        customLogoUri = CustomLogoRef.filename(from: stored)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(code, forKey: .code)
        try c.encode(format, forKey: .format)
        try c.encodeIfPresent(color, forKey: .color)
        try c.encodeIfPresent(logoSlug, forKey: .logoSlug)
        try c.encodeIfPresent(customLogoUri, forKey: .customLogoUri)
        try c.encodeIfPresent(notes, forKey: .notes)
        try c.encode(sortIndex, forKey: .sortIndex)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encode(updatedAt, forKey: .updatedAt)
    }
}

public struct Settings: Codable, Equatable, Sendable {
    public var themeMode: ThemeMode
    public var sortMode: SortMode
    public var language: LanguagePreference

    public static let `default` = Settings(themeMode: .system, sortMode: .manual, language: .system)

    public init(
        themeMode: ThemeMode = .system,
        sortMode: SortMode = .manual,
        language: LanguagePreference = .system
    ) {
        self.themeMode = themeMode
        self.sortMode = sortMode
        self.language = language
    }
}

public struct TutorialState: Codable, Equatable, Sendable {
    public var enabled: Bool
    /// Keys are `TutorialStepId.rawValue`. Stored as a JSON object.
    public var seenSteps: [String: Bool]

    public static let `default` = TutorialState(enabled: true, seenSteps: [:])

    public init(enabled: Bool = true, seenSteps: [String: Bool] = [:]) {
        self.enabled = enabled
        self.seenSteps = seenSteps
    }
}

public struct WalletDocument: Codable, Equatable, Sendable {
    public static let currentSchemaVersion = 1

    public var schemaVersion: Int
    public var cards: [CardId: FidelityCard]
    public var settings: Settings
    public var tutorial: TutorialState
    public var migratedFromExpo: Bool

    public static let empty = WalletDocument(
        schemaVersion: currentSchemaVersion,
        cards: [:],
        settings: .default,
        tutorial: .default,
        migratedFromExpo: false
    )

    public init(
        schemaVersion: Int = currentSchemaVersion,
        cards: [CardId: FidelityCard] = [:],
        settings: Settings = .default,
        tutorial: TutorialState = .default,
        migratedFromExpo: Bool = false
    ) {
        self.schemaVersion = schemaVersion
        self.cards = cards
        self.settings = settings
        self.tutorial = tutorial
        self.migratedFromExpo = migratedFromExpo
    }

    enum CodingKeys: String, CodingKey {
        case schemaVersion, cards, settings, tutorial, migratedFromExpo
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = try c.decode(Int.self, forKey: .schemaVersion)
        cards = try c.decode([CardId: FidelityCard].self, forKey: .cards)
        settings = try c.decode(Settings.self, forKey: .settings)
        tutorial = try c.decode(TutorialState.self, forKey: .tutorial)
        migratedFromExpo = try c.decodeIfPresent(Bool.self, forKey: .migratedFromExpo) ?? false
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(schemaVersion, forKey: .schemaVersion)
        try c.encode(cards, forKey: .cards)
        try c.encode(settings, forKey: .settings)
        try c.encode(tutorial, forKey: .tutorial)
        try c.encode(migratedFromExpo, forKey: .migratedFromExpo)
    }
}

public struct BrandEntry: Codable, Equatable, Sendable, Identifiable {
    public var slug: String
    public var name: String
    public var aliases: [String]
    public var alt: String
    public var primaryColor: String
    public var secondaryColor: String
    public var logo: String

    public var id: String { slug }

    public init(
        slug: String,
        name: String,
        aliases: [String],
        alt: String,
        primaryColor: String,
        secondaryColor: String,
        logo: String
    ) {
        self.slug = slug
        self.name = name
        self.aliases = aliases
        self.alt = alt
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.logo = logo
    }
}

public enum TesseroneError: Error, Equatable, LocalizedError {
    case invalidExport
    case missingCardsArray
    case invalidCard
    case malformedJSON
    case brandIndexMissing
    case storeUnavailable
    case io(String)

    public var errorDescription: String? {
        switch self {
        case .invalidExport:
            return "Invalid file format"
        case .missingCardsArray:
            return "Missing or invalid cards array"
        case .invalidCard:
            return "Invalid card data — missing required fields"
        case .malformedJSON:
            return "Malformed JSON"
        case .brandIndexMissing:
            return "brand-index.json is missing from the app bundle"
        case .storeUnavailable:
            return "Wallet store is unavailable"
        case .io(let message):
            return message
        }
    }
}

public enum ISODate {
    public static func now() -> String { string(from: Date()) }

    public static func string(from date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter.string(from: date)
    }

    public static func date(from string: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: string) { return date }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: string)
    }
}

public func getSortedCards(_ cards: [CardId: FidelityCard], mode: SortMode) -> [FidelityCard] {
    var list = Array(cards.values)
    switch mode {
    case .manual:
        list.sort {
            if $0.sortIndex != $1.sortIndex { return $0.sortIndex < $1.sortIndex }
            return $0.id < $1.id
        }
    case .alphabetical:
        list.sort {
            let order = $0.name.localizedStandardCompare($1.name)
            if order != .orderedSame { return order == .orderedAscending }
            return $0.id < $1.id
        }
    case .dateCreated:
        list.sort {
            if $0.createdAt != $1.createdAt { return $0.createdAt > $1.createdAt }
            return $0.id < $1.id
        }
    case .dateModified:
        list.sort {
            if $0.updatedAt != $1.updatedAt { return $0.updatedAt > $1.updatedAt }
            return $0.id < $1.id
        }
    }
    return list
}

public func nextSortIndex(_ cards: [CardId: FidelityCard]) -> Int {
    let values = cards.values
    guard let max = values.map(\.sortIndex).max() else { return 0 }
    return max + 1
}
