import Foundation
import TesseroneKit
import WatchConnectivity

/// Phone-side WatchConnectivity. Debounced `updateApplicationContext` plus
/// `transferFile` for logos — port of `src/services/watch.ts`.
final class WatchSync: NSObject, WCSessionDelegate {
    static let shared = WatchSync()

    private let debounce: TimeInterval = 0.5
    private let queue = DispatchQueue(label: "com.chipcolate.tesserone.watchsync")
    private var pendingWork: DispatchWorkItem?
    private var lastSnapshotJSON: String?
    private var knownLogos: [String: String] = [:]
    private var store: WalletStore?
    private var brands: BrandIndex?
    private var started = false
    private var observer: NSObjectProtocol?

    private var cacheURL: URL {
        StorePaths.resolvedRoot().appendingPathComponent("watch-known-logos.json")
    }

    func start(store: WalletStore, brands: BrandIndex?) {
        queue.async {
            self.store = store
            self.brands = brands
            self.loadCache()
            if !self.started {
                self.started = true
                if WCSession.isSupported() {
                    let session = WCSession.default
                    session.delegate = self
                    session.activate()
                }
                self.observer = NotificationCenter.default.addObserver(
                    forName: .walletDidSave,
                    object: nil,
                    queue: nil
                ) { [weak self] _ in
                    self?.schedulePush()
                }
            }
            self.schedulePushLocked()
        }
    }

    func schedulePush() {
        queue.async { self.schedulePushLocked() }
    }

    private func schedulePushLocked() {
        pendingWork?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.pushNow()
        }
        pendingWork = work
        queue.asyncAfter(deadline: .now() + debounce, execute: work)
    }

    private func pushNow() {
        guard let store else { return }
        Task {
            let document = await store.snapshot()
            self.queue.async {
                self.push(document: document, logos: store.customLogos)
            }
        }
    }

    private func push(document: WalletDocument, logos: CustomLogoStore) {
        let snapshot = CardSnapshot.buildWatchSnapshot(document)
        guard let data = try? JSONEncoder().encode(snapshot),
              let json = String(data: data, encoding: .utf8)
        else { return }
        let contextChanged = json != lastSnapshotJSON
        if contextChanged {
            do {
                let dict = try CardSnapshot.dictionary(from: snapshot)
                if WCSession.isSupported() {
                    let session = WCSession.default
                    guard session.activationState == .activated else {
                        lastSnapshotJSON = nil
                        return
                    }
                    try session.updateApplicationContext(dict)
                }
                lastSnapshotJSON = json
            } catch {
                NSLog("[watch] updateApplicationContext failed: %@", error.localizedDescription)
                lastSnapshotJSON = nil
                return
            }
        }
        syncLogos(document: document, snapshot: snapshot, logos: logos)
    }

    private func syncLogos(document: WalletDocument, snapshot: WatchSnapshot, logos: CustomLogoStore) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }

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
            guard FileManager.default.fileExists(atPath: value.url.path) else { continue }
            session.transferFile(value.url, metadata: [
                "kind": "logo",
                "logoKey": key,
                "updatedAt": value.updatedAt,
            ])
            knownLogos[key] = value.updatedAt
        }

        let keep = Set(desired.keys)
        knownLogos = knownLogos.filter { keep.contains($0.key) }
        persistCache()
    }

    private func forceFreshPush(resetLogos: Bool) {
        queue.async {
            self.lastSnapshotJSON = nil
            if resetLogos {
                self.knownLogos = [:]
                self.persistCache()
            }
            self.schedulePushLocked()
        }
    }

    private func handleMessage(_ payload: [String: Any], reply: (([String: Any]) -> Void)?) {
        let kind = payload["kind"] as? String
        switch kind {
        case "requestInitialSync":
            queue.async {
                self.knownLogos = [:]
                self.lastSnapshotJSON = nil
                self.persistCache()
                self.pushNow()
            }
            reply?(["ok": true])
        case "logoRequest":
            guard let cardId = payload["cardId"] as? String else {
                reply?(["ok": false, "reason": "badRequest"])
                return
            }
            handleLogoRequest(cardId: cardId, reply: reply)
        default:
            reply?(["ok": false, "reason": "unknownKind"])
        }
    }

    private func handleLogoRequest(cardId: String, reply: (([String: Any]) -> Void)?) {
        guard let store else {
            reply?(["ok": false, "reason": "unresolved"])
            return
        }
        Task {
            let document = await store.snapshot()
            self.queue.async {
                guard let card = document.cards[cardId] else {
                    reply?(["ok": false, "reason": "unknownCard"])
                    return
                }
                guard let target = CardSnapshot.logoTarget(for: card) else {
                    reply?(["ok": false, "reason": "noLogo"])
                    return
                }
                guard let url = CardSnapshot.logoFileURL(
                    for: card,
                    brands: self.brands,
                    customLogos: store.customLogos
                ) else {
                    reply?(["ok": false, "reason": "unresolved"])
                    return
                }
                guard WCSession.isSupported() else {
                    reply?(["ok": false, "reason": "transferFailed"])
                    return
                }
                WCSession.default.transferFile(url, metadata: [
                    "kind": "logo",
                    "logoKey": target.key,
                    "updatedAt": card.updatedAt,
                ])
                self.knownLogos[target.key] = card.updatedAt
                self.persistCache()
                reply?(["ok": true, "logoKey": target.key])
            }
        }
    }

    private func loadCache() {
        guard let data = try? Data(contentsOf: cacheURL),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data)
        else {
            knownLogos = [:]
            return
        }
        knownLogos = decoded
    }

    private func persistCache() {
        try? FileManager.default.createDirectory(
            at: cacheURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        if let data = try? JSONEncoder().encode(knownLogos) {
            try? data.write(to: cacheURL, options: .atomic)
        }
    }

    // MARK: - WCSessionDelegate

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        if let error {
            NSLog("[watch] activation failed: %@", error.localizedDescription)
        }
        if activationState == .activated {
            schedulePush()
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        if session.isPaired && session.isWatchAppInstalled {
            forceFreshPush(resetLogos: true)
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if session.isReachable {
            forceFreshPush(resetLogos: false)
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleMessage(message, reply: nil)
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        handleMessage(message, reply: replyHandler)
    }

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        if let error {
            NSLog("[watch] transferFile failed: %@", error.localizedDescription)
            if let key = fileTransfer.file.metadata?["logoKey"] as? String {
                queue.async {
                    self.knownLogos.removeValue(forKey: key)
                    self.lastSnapshotJSON = nil
                    self.persistCache()
                }
            }
        }
    }
}
