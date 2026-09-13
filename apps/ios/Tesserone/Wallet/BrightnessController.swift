import UIKit

/// Saves/restores `UIScreen.main.brightness` while a barcode is expanded.
final class BrightnessController {
    private var saved: CGFloat?
    private var overrideActive = false

    func maximize() {
        if !overrideActive {
            saved = UIScreen.main.brightness
        }
        UIScreen.main.brightness = 1
        overrideActive = true
    }

    func restore() {
        guard overrideActive else { return }
        overrideActive = false
        if let saved {
            UIScreen.main.brightness = saved
        }
        saved = nil
    }
}
