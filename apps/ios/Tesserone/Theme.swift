import SwiftUI
import TesseroneKit
import UIKit

enum RawGeometry {
    static let chromeRadius: CGFloat = 4
    static let cardRadius: CGFloat = 2
    static let tileRadius: CGFloat = 2
}

struct Palette {
    var isDark: Bool

    var bg: Color { Color(hex: isDark ? "#0A0A0A" : "#FAFAF8") }
    var surface: Color { Color(hex: isDark ? "#161616" : "#F0F0ED") }
    var text: Color { Color(hex: isDark ? "#F5F5F5" : "#1A1A1A") }
    var textSecondary: Color { Color(hex: isDark ? "#888888" : "#666666") }
    var border: Color { Color(hex: isDark ? "#2A2A2A" : "#E2E2DD") }
    var accent: Color { Color(hex: CardAppearance.accent) }
    var danger: Color { Color(hex: isDark ? "#FF6B6B" : "#D32F2F") }
    var dangerText: Color { Color(hex: "#FFFFFF") }
}

private struct PaletteKey: EnvironmentKey {
    static let defaultValue = Palette(isDark: true)
}

extension EnvironmentValues {
    var palette: Palette {
        get { self[PaletteKey.self] }
        set { self[PaletteKey.self] = newValue }
    }
}

enum CardColors {
    /// `shared/tokens/colors.json` `cardColors`.
    static let all: [String] = [
        "#EF5350", "#D32F2F", "#EC407A", "#C2185B", "#AB47BC", "#7B1FA2",
        "#5C6BC0", "#303F9F", "#42A5F5", "#1565C0", "#26C6DA", "#00838F",
        "#66BB6A", "#2E7D32", "#9CCC65", "#689F38", "#FFCA28", "#F9A825",
        "#FFA726", "#E65100", "#8D6E63", "#4E342E", "#78909C", "#37474F",
        "#000000", "#CCCCCC", "#FFFFFF",
    ]
}

extension Color {
    init(hex: String) {
        let c = HexColor(hex: hex) ?? HexColor(hex: "#333333")!
        self.init(red: c.red, green: c.green, blue: c.blue)
    }
}

extension UIColor {
    convenience init(hex: String) {
        let c = HexColor(hex: hex) ?? HexColor(hex: "#333333")!
        self.init(red: c.red, green: c.green, blue: c.blue, alpha: 1)
    }
}

struct LogoCatalog {
    var brands: BrandIndex?
    var customLogos: CustomLogoStore

    func backgroundHex(for card: FidelityCard) -> String {
        CardAppearance.resolveColor(card, brands: brands)
    }

    func logo(for card: FidelityCard) -> UIImage? {
        if let url = customLogos.fileURL(for: card.customLogoUri),
           FileManager.default.fileExists(atPath: url.path),
           let data = try? Data(contentsOf: url),
           let image = UIImage(data: data) {
            return image
        }
        guard let slug = card.logoSlug, let file = brands?.brand(slug: slug)?.logo else { return nil }
        return Self.bundledLogo(named: file)
    }

    static func bundledLogo(named filename: String) -> UIImage? {
        let name = (filename as NSString).deletingPathExtension
        let ext = (filename as NSString).pathExtension
        let bundle = Bundle.main
        let url = bundle.url(forResource: name, withExtension: ext, subdirectory: "brands/logos")
            ?? bundle.url(forResource: name, withExtension: ext, subdirectory: "logos")
            ?? bundle.url(forResource: name, withExtension: ext)
        if let url, let data = try? Data(contentsOf: url), let image = UIImage(data: data) {
            return image
        }
        return UIImage(named: "brands/logos/\(filename)") ?? UIImage(named: filename)
    }
}
