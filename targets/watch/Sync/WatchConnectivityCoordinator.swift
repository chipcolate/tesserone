import Foundation
import WatchConnectivity

@MainActor
final class WatchConnectivityCoordinator: NSObject, ObservableObject {
    @Published private(set) var statusMessage: String = "starting"

    private let session: WCSession?

    override init() {
        self.session = WCSession.isSupported() ? WCSession.default : nil
        super.init()
        guard let session else {
            statusMessage = "WC unsupported"
            return
        }
        session.delegate = self
        session.activate()
        statusMessage = "activating"
    }
}

extension WatchConnectivityCoordinator: WCSessionDelegate {
    nonisolated func session(_ session: WCSession,
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
        Task { @MainActor [weak self] in
            self?.statusMessage = msg
        }
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveApplicationContext applicationContext: [String: Any]) {
        NSLog("[TesseroneWatch] applicationContext keys: %@",
              applicationContext.keys.sorted().description)
    }
}
