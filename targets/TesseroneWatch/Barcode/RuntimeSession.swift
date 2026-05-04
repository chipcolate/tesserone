import Foundation
import WatchKit

/// Wraps WKExtendedRuntimeSession so the barcode view can keep the screen
/// lit past the default ~15 s wrist-down timeout. The OS may still revoke
/// the session if the user navigates away, which is fine.
final class RuntimeSession: NSObject, ObservableObject, WKExtendedRuntimeSessionDelegate {
    private var session: WKExtendedRuntimeSession?

    func start() {
        guard session == nil else { return }
        let s = WKExtendedRuntimeSession()
        s.delegate = self
        s.start()
        session = s
    }

    func stop() {
        session?.invalidate()
        session = nil
    }

    deinit {
        session?.invalidate()
    }

    func extendedRuntimeSessionDidStart(_ session: WKExtendedRuntimeSession) {
        NSLog("[TesseroneWatch] runtime session started")
    }

    func extendedRuntimeSessionWillExpire(_ session: WKExtendedRuntimeSession) {
        NSLog("[TesseroneWatch] runtime session will expire")
    }

    func extendedRuntimeSession(_ session: WKExtendedRuntimeSession,
                                didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason,
                                error: Error?) {
        self.session = nil
        NSLog("[TesseroneWatch] runtime session invalidated: %d %@",
              reason.rawValue, error?.localizedDescription ?? "")
    }
}
