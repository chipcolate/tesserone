import Combine
import SwiftUI
import TesseroneKit
import UIKit

@main
struct TesseroneApp: App {
    @StateObject private var model = AppModel()

    init() {
        Mono.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .task { await model.start() }
                .onOpenURL { model.handleOpenURL($0) }
        }
    }
}

struct PendingScan: Equatable {
    var imageURL: URL?
    var code: String?
    var format: BarcodeFormat?
}

struct ToastMessage: Identifiable {
    let id = UUID()
    var message: String
    var actionLabel: String?
    var onAction: (() -> Void)?
}

@MainActor
final class AppModel: ObservableObject {
    @Published var cards: [FidelityCard] = []
    @Published var themeMode: ThemeMode = .system
    @Published var sortMode: SortMode = .manual
    @Published var language: LanguagePreference = .system
    @Published var tutorial = TutorialState.default
    @Published var reorderMode = false
    @Published var loadError: String?
    @Published var isReady = false
    @Published var pendingOpenId: String?
    @Published var openNonce = 0
    @Published var brandIndex: BrandIndex?
    @Published var l10n = L10n(language: "en", table: [:])
    @Published var pendingScan: PendingScan?
    @Published var toast: ToastMessage?

    let store = WalletStore.appGroupStore()

    var catalog: LogoCatalog {
        LogoCatalog(brands: brandIndex, customLogos: store.customLogos)
    }

    var resolvedLanguage: String {
        L10n.resolveLanguage(language)
    }

    func t(_ key: String, _ interpolations: [String: String] = [:], count: Int? = nil) -> String {
        l10n.t(key, interpolations, count: count)
    }

    func start() async {
        brandIndex = try? BrandIndex.loadFromBundle()
        do {
            try await store.load()
            _ = try await ExpoMigrator.migrateIfNeeded(
                store: store,
                asyncStorageDirectory: ExpoStoragePaths.asyncStorageDirectory(),
                expoCustomLogosDirectory: ExpoStoragePaths.customLogosDirectory()
            )
            await publish()
            WatchSync.shared.start(store: store, brands: brandIndex)
            WidgetSync.start(store: store, brands: brandIndex)
            ingestPendingScanFile()
        } catch {
            loadError = error.localizedDescription
        }
        isReady = true
    }

    func publish() async {
        let document = await store.snapshot()
        cards = await store.getSortedCards()
        themeMode = document.settings.themeMode
        sortMode = document.settings.sortMode
        language = document.settings.language
        tutorial = document.tutorial
        l10n = L10n.load(preference: document.settings.language)
    }

    func addCard(_ card: FidelityCard) {
        Task {
            do {
                try await store.addCard(card)
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func addDraftCard(
        name: String,
        code: String,
        format: BarcodeFormat,
        color: String,
        logoSlug: String?,
        customLogoUri: String?,
        notes: String?
    ) async throws {
        let sortIndex = await store.nextSortIndex()
        let now = ISODate.now()
        let card = FidelityCard(
            id: UUID().uuidString,
            name: name,
            code: code,
            format: format,
            color: color,
            logoSlug: logoSlug,
            customLogoUri: customLogoUri,
            notes: notes,
            sortIndex: sortIndex,
            createdAt: now,
            updatedAt: now
        )
        try await store.addCard(card)
        await publish()
    }

    func updateCard(_ card: FidelityCard) {
        Task {
            do {
                try await store.updateCard(id: card.id) { current in
                    current.name = card.name
                    current.code = card.code
                    current.format = card.format
                    current.color = card.color
                    current.logoSlug = card.logoSlug
                    current.customLogoUri = card.customLogoUri
                    current.notes = card.notes
                }
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func deleteCard(_ card: FidelityCard) {
        Task {
            do {
                try await store.removeCard(id: card.id)
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func restoreCard(_ card: FidelityCard) {
        addCard(card)
    }

    func deleteAllCards() {
        Task {
            let snapshot = await store.snapshot()
            for card in snapshot.cards.values {
                store.customLogos.remove(card.customLogoUri)
            }
            do {
                try await store.replaceCards([:])
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func writeCustomLogo(_ image: UIImage) throws -> String {
        guard let data = image.jpegData(compressionQuality: 0.9) else {
            throw TesseroneError.io("Could not encode image")
        }
        return try store.customLogos.write(data: data)
    }

    func removeCustomLogo(_ stored: String?) {
        store.customLogos.remove(stored)
    }

    func reorder(from: Int, to: Int) {
        guard cards.indices.contains(from) else { return }
        let id = cards[from].id
        Task {
            do {
                try await store.reorderCard(id: id, to: to)
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func applySort(_ mode: SortMode) {
        Task {
            var settings = await store.snapshot().settings
            settings.sortMode = mode
            do {
                try await store.applySettings(settings)
                await publish()
                if mode != .manual {
                    reorderMode = false
                }
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func setThemeMode(_ mode: ThemeMode) {
        Task {
            var settings = await store.snapshot().settings
            settings.themeMode = mode
            do {
                try await store.applySettings(settings)
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func setLanguage(_ preference: LanguagePreference) {
        Task {
            var settings = await store.snapshot().settings
            settings.language = preference
            do {
                try await store.applySettings(settings)
                await publish()
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func setReorderMode(_ on: Bool) {
        reorderMode = on
        if on, sortMode != .manual {
            applySort(.manual)
        }
    }

    func markTutorialSeen(_ id: TutorialStepId) {
        Task {
            var next = await store.snapshot().tutorial
            next.seenSteps[id.rawValue] = true
            do {
                try await store.applyTutorial(next)
                tutorial = next
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func skipTutorial() {
        Task {
            var next = await store.snapshot().tutorial
            next.enabled = false
            do {
                try await store.applyTutorial(next)
                tutorial = next
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func resetTutorial() {
        Task {
            let next = TutorialState(enabled: true, seenSteps: [:])
            do {
                try await store.applyTutorial(next)
                tutorial = next
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    func exportWalletData() throws -> Data {
        let settings = Settings(themeMode: themeMode, sortMode: sortMode, language: language)
        let doc = ImportExport.makeExport(cards: cards, settings: settings, logos: store.customLogos)
        return try ImportExport.encode(doc)
    }

    func shareCardData(_ card: FidelityCard) throws -> Data {
        try ImportExport.encode(ImportExport.makeCardShare(card: card, logos: store.customLogos))
    }

    func parseImport(from url: URL) throws -> ImportResult {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let data = try Data(contentsOf: url)
        return try ImportExport.parse(data, logos: store.customLogos)
    }

    func mergeImported(_ imported: [FidelityCard], strategy: MergeStrategy) async throws {
        let existing = await store.snapshot()
        let merged = ImportExport.mergeCards(existing: existing.cards, imported: imported, strategy: strategy)
        try await store.replaceCards(merged)
        await publish()
    }

    func showToast(message: String, actionLabel: String? = nil, onAction: (() -> Void)? = nil) {
        toast = ToastMessage(message: message, actionLabel: actionLabel, onAction: onAction)
    }

    func consumePendingScan() -> PendingScan? {
        let scan = pendingScan
        pendingScan = nil
        return scan
    }

    func ingestPendingScanFile() {
        if let payload = PendingScanStore.load() {
            PendingScanStore.clear()
            pendingScan = PendingScan(code: payload.code, format: payload.format)
            return
        }
    }

    func handleOpenURL(_ url: URL) {
        guard url.scheme == "tesserone" else { return }
        let host = url.host
        let parts = url.pathComponents.filter { $0 != "/" }

        if host == "add" || parts.first == "add" {
            if PendingScanStore.load() != nil {
                ingestPendingScanFile()
            } else if pendingScan == nil {
                pendingScan = PendingScan()
            }
            return
        }

        let id: String
        if host == "open" {
            id = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        } else {
            guard parts.count >= 2, parts[0] == "open" else { return }
            id = parts[1]
        }
        guard !id.isEmpty else { return }
        pendingOpenId = id
        openNonce += 1
    }
}

enum LanguageLabels {
    static func native(_ pref: LanguagePreference) -> String {
        switch pref {
        case .system: return ""
        case .en: return "English"
        case .it: return "Italiano"
        case .fr: return "Français"
        case .es: return "Español"
        case .de: return "Deutsch"
        }
    }
}
