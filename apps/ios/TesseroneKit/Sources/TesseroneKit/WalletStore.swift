import Foundation

public enum StorePaths {
    public static let appGroupId = "group.com.chipcolate.tesserone"
    public static let walletFileName = "wallet.json"
    public static let customLogosDirName = "custom-logos"
    public static let storeDirName = "store"
    public static let widgetsDirName = "widgets"
    public static let widgetLogosDirName = "logos"
    public static let widgetSnapshotFileName = "snapshot.json"
    public static let pendingScanFileName = "pending-scan.json"

    public static func appGroupContainer(fileManager: FileManager = .default) -> URL? {
        #if os(iOS) || os(macOS) || os(tvOS) || os(watchOS)
        return fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
        #else
        return nil
        #endif
    }

    /// App Group `store/` when the entitlement is live; otherwise Application Support.
    public static func resolvedRoot(fileManager: FileManager = .default) -> URL {
        if let container = appGroupContainer(fileManager: fileManager) {
            return container.appendingPathComponent(storeDirName, isDirectory: true)
        }
        let support = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return support
            .appendingPathComponent("Tesserone", isDirectory: true)
            .appendingPathComponent(storeDirName, isDirectory: true)
    }

    public static func pendingScanURL(fileManager: FileManager = .default) -> URL {
        resolvedRoot(fileManager: fileManager).appendingPathComponent(pendingScanFileName)
    }

    /// App Group `widgets/`. Nil when the group container is unavailable (no entitlement).
    public static func widgetsRoot(fileManager: FileManager = .default) -> URL? {
        guard let container = appGroupContainer(fileManager: fileManager) else { return nil }
        return container.appendingPathComponent(widgetsDirName, isDirectory: true)
    }

    public static func widgetSnapshotURL(fileManager: FileManager = .default) -> URL? {
        widgetsRoot(fileManager: fileManager)?.appendingPathComponent(widgetSnapshotFileName)
    }

    public static func widgetLogosRoot(fileManager: FileManager = .default) -> URL? {
        widgetsRoot(fileManager: fileManager)?.appendingPathComponent(widgetLogosDirName, isDirectory: true)
    }
}

extension Notification.Name {
    /// Posted after `WalletStore.save()` writes `wallet.json`.
    public static let walletDidSave = Notification.Name("com.chipcolate.tesserone.walletDidSave")
}

public actor WalletStore {
    nonisolated public let rootURL: URL
    nonisolated public let walletURL: URL
    nonisolated public let customLogos: CustomLogoStore

    private var document: WalletDocument = .empty

    public init(rootURL: URL) {
        self.rootURL = rootURL
        self.walletURL = rootURL.appendingPathComponent(StorePaths.walletFileName)
        self.customLogos = CustomLogoStore(
            directory: rootURL.appendingPathComponent(StorePaths.customLogosDirName, isDirectory: true)
        )
    }

    public static func appGroupStore() -> WalletStore {
        WalletStore(rootURL: StorePaths.resolvedRoot())
    }

    public func snapshot() -> WalletDocument { document }

    public func load() throws {
        let fm = FileManager.default
        if fm.fileExists(atPath: walletURL.path) {
            let data = try Data(contentsOf: walletURL)
            document = try JSONDecoder().decode(WalletDocument.self, from: data)
        } else {
            document = .empty
        }
    }

    public func save() throws {
        try FileManager.default.createDirectory(at: rootURL, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(document)
        try data.write(to: walletURL, options: .atomic)
        NotificationCenter.default.post(name: .walletDidSave, object: nil)
    }

    public func addCard(_ card: FidelityCard) throws {
        document.cards[card.id] = card
        try save()
    }

    public func updateCard(id: CardId, mutate: (inout FidelityCard) -> Void) throws {
        guard var card = document.cards[id] else { return }
        mutate(&card)
        card.updatedAt = ISODate.now()
        document.cards[id] = card
        try save()
    }

    public func removeCard(id: CardId) throws {
        document.cards.removeValue(forKey: id)
        try save()
    }

    public func copyCustomLogos(from source: URL) throws {
        try customLogos.copyAll(from: source)
    }

    public func reorderCard(id: CardId, to newIndex: Int) throws {
        var list = TesseroneKit.getSortedCards(document.cards, mode: .manual)
        guard let oldIdx = list.firstIndex(where: { $0.id == id }) else { return }
        let moved = list.remove(at: oldIdx)
        let clamped = min(max(newIndex, 0), list.count)
        list.insert(moved, at: clamped)
        var updated: [CardId: FidelityCard] = [:]
        for (i, card) in list.enumerated() {
            var copy = card
            copy.sortIndex = i
            updated[copy.id] = copy
        }
        document.cards = updated
        try save()
    }

    public func replaceCards(_ cards: [CardId: FidelityCard]) throws {
        document.cards = cards
        try save()
    }

    public func applySettings(_ settings: Settings) throws {
        document.settings = settings
        try save()
    }

    public func applyTutorial(_ tutorial: TutorialState) throws {
        document.tutorial = tutorial
        try save()
    }

    public func setMigratedFromExpo(_ value: Bool) throws {
        document.migratedFromExpo = value
        try save()
    }

    public func replaceWallet(
        cards: [CardId: FidelityCard],
        settings: Settings,
        tutorial: TutorialState,
        migratedFromExpo: Bool
    ) throws {
        document.cards = cards
        document.settings = settings
        document.tutorial = tutorial
        document.migratedFromExpo = migratedFromExpo
        document.schemaVersion = WalletDocument.currentSchemaVersion
        try save()
    }

    public func nextSortIndex() -> Int {
        TesseroneKit.nextSortIndex(document.cards)
    }

    public func getSortedCards() -> [FidelityCard] {
        TesseroneKit.getSortedCards(document.cards, mode: document.settings.sortMode)
    }

    public func getSortedCards(mode: SortMode) -> [FidelityCard] {
        TesseroneKit.getSortedCards(document.cards, mode: mode)
    }
}
