import Foundation

struct RawImportedCard: Decodable {
    var id: String
    var name: String
    var code: String
    var format: String
    var color: String?
    var logoSlug: String?
    var customLogoUri: String?
    var notes: String?
    var sortIndex: Int?
    var createdAt: String?
    var updatedAt: String?
}

struct CardsPersistState: Decodable {
    var cards: [String: RawImportedCard]
}

struct SettingsPersistState: Decodable {
    var themeMode: String?
    var sortMode: String?
    var language: String?
}

struct TutorialPersistState: Decodable {
    var enabled: Bool?
    var seenSteps: [String: Bool]?
}

enum CardNormalization {
    static func card(
        from raw: RawImportedCard,
        index: Int,
        now: String,
        logos: CustomLogoStore?
    ) -> FidelityCard {
        FidelityCard(
            id: raw.id,
            name: raw.name,
            code: raw.code,
            format: BarcodeFormat.normalize(raw.format),
            color: raw.color,
            logoSlug: raw.logoSlug,
            customLogoUri: normalizeCustomLogo(raw.customLogoUri, logos: logos),
            notes: raw.notes,
            sortIndex: raw.sortIndex ?? index,
            createdAt: raw.createdAt ?? now,
            updatedAt: raw.updatedAt ?? now
        )
    }

    static func normalizeCustomLogo(_ value: String?, logos: CustomLogoStore?) -> String? {
        guard let value, !value.isEmpty else { return nil }
        if value.hasPrefix("data:") {
            return logos?.writeFromDataURI(value)
        }
        return CustomLogoRef.filename(from: value)
    }

    static func cards(fromPersistJSON string: String, logos: CustomLogoStore? = nil) -> [CardId: FidelityCard] {
        guard let envelope = try? ZustandPersist.unwrap(string, as: CardsPersistState.self) else {
            return [:]
        }
        let now = ISODate.now()
        var result: [CardId: FidelityCard] = [:]
        for (index, (id, raw)) in envelope.state.cards.enumerated() {
            var card = card(from: raw, index: index, now: now, logos: logos)
            if card.id != id { card.id = id }
            result[card.id] = card
        }
        return result
    }

    static func settings(fromPersistJSON string: String) -> Settings {
        guard let envelope = try? ZustandPersist.unwrap(string, as: SettingsPersistState.self) else {
            return .default
        }
        let state = envelope.state
        return Settings(
            themeMode: ThemeMode(rawValue: state.themeMode ?? "") ?? .system,
            sortMode: SortMode(rawValue: state.sortMode ?? "") ?? .manual,
            language: LanguagePreference(rawValue: state.language ?? "") ?? .system
        )
    }

    static func tutorial(fromPersistJSON string: String) -> TutorialState {
        guard let envelope = try? ZustandPersist.unwrap(string, as: TutorialPersistState.self) else {
            return .default
        }
        return TutorialState(
            enabled: envelope.state.enabled ?? true,
            seenSteps: envelope.state.seenSteps ?? [:]
        )
    }
}

public enum ExpoMigrator {
    public struct Outcome: Equatable, Sendable {
        public var migrated: Bool
        public var skipped: Bool
        public var cardCount: Int
    }

    /// One-shot: if the native store already has cards, or `migratedFromExpo` is set, skip.
    /// AsyncStorage is left in place.
    @discardableResult
    public static func migrateIfNeeded(
        store: WalletStore,
        asyncStorageDirectory: URL,
        expoCustomLogosDirectory: URL
    ) async throws -> Outcome {
        try await store.load()
        let existing = await store.snapshot()
        if existing.migratedFromExpo {
            return Outcome(migrated: false, skipped: true, cardCount: existing.cards.count)
        }
        if !existing.cards.isEmpty {
            return Outcome(migrated: false, skipped: true, cardCount: existing.cards.count)
        }

        let manifestURL = asyncStorageDirectory.appendingPathComponent("manifest.json")
        guard FileManager.default.fileExists(atPath: manifestURL.path) else {
            try await store.setMigratedFromExpo(true)
            return Outcome(migrated: false, skipped: false, cardCount: 0)
        }

        let values = try AsyncLocalStorage.readManifest(directory: asyncStorageDirectory)

        var cards: [CardId: FidelityCard] = [:]
        var settings = Settings.default
        var tutorial = TutorialState.default

        if let raw = values["cards"] {
            cards = CardNormalization.cards(fromPersistJSON: raw, logos: nil)
        }
        if let raw = values["settings"] {
            settings = CardNormalization.settings(fromPersistJSON: raw)
        }
        if let raw = values["tutorial"] {
            tutorial = CardNormalization.tutorial(fromPersistJSON: raw)
        }

        try await store.copyCustomLogos(from: expoCustomLogosDirectory)
        try await store.replaceWallet(
            cards: cards,
            settings: settings,
            tutorial: tutorial,
            migratedFromExpo: true
        )

        return Outcome(migrated: true, skipped: false, cardCount: cards.count)
    }
}
