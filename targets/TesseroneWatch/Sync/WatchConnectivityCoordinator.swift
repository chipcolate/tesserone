import Foundation
import WatchConnectivity

final class WatchConnectivityCoordinator: NSObject, ObservableObject {
    @Published private(set) var statusMessage: String = "starting"

    private let snapshotStore: SnapshotStore
    private let logoCache: LogoCache
    private let session: WCSession?

    init(snapshotStore: SnapshotStore, logoCache: LogoCache) {
        self.snapshotStore = snapshotStore
        self.logoCache = logoCache
        self.session = WCSession.isSupported() ? WCSession.default : nil
        super.init()
        guard let session else {
            updateStatus("WC unsupported")
            return
        }
        session.delegate = self
        session.activate()
        updateStatus("activating")
    }

    func requestInitialSync() {
        guard let session, session.activationState == .activated else { return }
        session.sendMessage(["kind": "requestInitialSync"], replyHandler: nil) { error in
            NSLog("[TesseroneWatch] requestInitialSync failed: %@",
                  error.localizedDescription)
        }
    }

    private func updateStatus(_ msg: String) {
        DispatchQueue.main.async { [weak self] in
            self?.statusMessage = msg
        }
    }
}

extension WatchConnectivityCoordinator: WCSessionDelegate {
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        let state: String
        switch activationState {
        case .notActivated: state = "not activated"
        case .inactive: state = "inactive"
        case .activated: state = "activated"
        @unknown default: state = "unknown"
        }
        let msg = error.map { "\(state) - \($0.localizedDescription)" } ?? state
        NSLog("[TesseroneWatch] WCSession %@", msg)
        updateStatus(msg)

        if activationState == .activated && snapshotStore.snapshot == nil {
            requestInitialSync()
        }
    }

    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String: Any]) {
        NSLog("[TesseroneWatch] applicationContext keys: %@",
              applicationContext.keys.sorted().description)
        snapshotStore.update(from: applicationContext)
    }

    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        let metadata = file.metadata ?? [:]
        guard let kind = metadata["kind"] as? String, kind == "logo",
              let logoKey = metadata["logoKey"] as? String else {
            NSLog("[TesseroneWatch] received file without recognized metadata: %@",
                  metadata.description)
            return
        }
        logoCache.ingest(file: file.fileURL, logoKey: logoKey)
    }
}
