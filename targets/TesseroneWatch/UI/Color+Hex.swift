import SwiftUI

extension Color {
    init?(hex: String?) {
        guard var s = hex else { return nil }
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        let r = Double((v >> 16) & 0xFF) / 255.0
        let g = Double((v >> 8) & 0xFF) / 255.0
        let b = Double(v & 0xFF) / 255.0
        self = Color(red: r, green: g, blue: b)
    }

    /// Heuristic readable foreground for a solid color background.
    var readableForeground: Color {
        guard let cg = cgColor, let comps = cg.components, comps.count >= 3 else {
            return .white
        }
        let lum = 0.299 * comps[0] + 0.587 * comps[1] + 0.114 * comps[2]
        return lum > 0.6 ? .black : .white
    }
}
