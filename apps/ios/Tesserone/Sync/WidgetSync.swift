import Foundation
import TesseroneKit
import WidgetKit

/// Writes `widgets/snapshot.json` + logos into the App Group, then reloads
/// WidgetKit. Port of `src/services/widgets.ts` + `WidgetBridgeModule.swift`.
enum WidgetSync {
    private static let debounce: TimeInterval = 0.5
    private static let queue = DispatchQueue(label: "com.chipcolate.tesserone.widgetsync")
    private static var pendingWork: DispatchWorkItem?
    private static var lastSnapshotJSON: String?
    private static var knownLogos: [String: String] = [:]
    private static var store: WalletStore?
    private static var brands: BrandIndex?
    private static var started = false
    private static var observer: NSObjectProtocol?

    private static var cacheURL: URL {
        StorePaths.resolvedRoot().appendingPathComponent("widget-known-logos.json")
    }

    static func start(store: WalletStore, brands: BrandIndex?) {
        queue.async {
            self.store = store
            self.brands = brands
            loadCache()
            if !started {
                started = true
                observer = NotificationCenter.default.addObserver(
                    forName: .walletDidSave,
                    object: nil,
                    queue: nil
                ) { _ in
                    schedulePush()
                }
            }
            schedulePushLocked()
        }
    }

    static func push() {
        schedulePush()
    }

    static func schedulePush() {
        queue.async { schedulePushLocked() }
    }

    private static func schedulePushLocked() {
        pendingWork?.cancel()
        let work = DispatchWorkItem {
            pushNow()
        }
        pendingWork = work
        queue.asyncAfter(deadline: .now() + debounce, execute: work)
    }

    private static func pushNow() {
        guard let store else { return }
        Task {
            let document = await store.snapshot()
            queue.async {
                push(document: document, logos: store.customLogos)
            }
        }
    }

    private static func push(document: WalletDocument, logos: CustomLogoStore) {
        guard let widgetsDir = StorePaths.widgetsRoot(),
              let snapshotURL = StorePaths.widgetSnapshotURL(),
              let logosDir = StorePaths.widgetLogosRoot()
        else { return }

        let snapshot = CardSnapshot.buildWidgetSnapshot(document, brands: brands)
        guard let json = try? CardSnapshot.jsonString(from: snapshot) else { return }
        if json == lastSnapshotJSON { return }

        do {
            try FileManager.default.createDirectory(at: widgetsDir, withIntermediateDirectories: true)
            guard let data = json.data(using: .utf8) else { return }
            try data.write(to: snapshotURL, options: .atomic)
        } catch {
            NSLog("[widget] writeSnapshot failed: %@", error.localizedDescription)
            return
        }

        do {
            try syncLogos(document: document, snapshot: snapshot, logos: logos, logosDir: logosDir)
        } catch {
            NSLog("[widget] syncLogos failed; will retry on next change: %@", error.localizedDescription)
            return
        }

        lastSnapshotJSON = json
        WidgetCenter.shared.reloadAllTimelines()
    }

    private static func syncLogos(
        document: WalletDocument,
        snapshot: WidgetSnapshot,
        logos: CustomLogoStore,
        logosDir: URL
    ) throws {
        let fm = FileManager.default
        try fm.createDirectory(at: logosDir, withIntermediateDirectories: true)

        var desired: [String: (url: URL, updatedAt: String)] = [:]
        for snapCard in snapshot.cards {
            guard let full = document.cards[snapCard.id],
                  let target = CardSnapshot.logoTarget(for: full),
                  let url = CardSnapshot.logoFileURL(for: full, brands: brands, customLogos: logos)
            else { continue }
            desired[target.key] = (url, snapCard.updatedAt)
        }

        for (key, value) in desired {
            if knownLogos[key] == value.updatedAt { continue }
            let dest = logosDir.appendingPathComponent(CardSnapshot.sanitizeLogoKey(key) + ".png")
            let data = try Data(contentsOf: value.url)
            try data.write(to: dest, options: .atomic)
            knownLogos[key] = value.updatedAt
        }

        let keep = Set(desired.keys.map { CardSnapshot.sanitizeLogoKey($0) + ".png" })
        let items = (try? fm.contentsOfDirectory(atPath: logosDir.path)) ?? []
        for item in items where !keep.contains(item) {
            try? fm.removeItem(at: logosDir.appendingPathComponent(item))
        }
        knownLogos = knownLogos.filter { desired.keys.contains($0.key) }
        persistCache()
    }

    private static func loadCache() {
        guard let data = try? Data(contentsOf: cacheURL),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data)
        else {
            knownLogos = [:]
            return
        }
        knownLogos = decoded
    }

    private static func persistCache() {
        try? FileManager.default.createDirectory(
            at: cacheURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        if let data = try? JSONEncoder().encode(knownLogos) {
            try? data.write(to: cacheURL, options: .atomic)
        }
    }
}
