import Foundation

public struct HexColor: Equatable, Sendable {
    public var red: Double
    public var green: Double
    public var blue: Double

    public init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        red = Double((v >> 16) & 0xFF) / 255
        green = Double((v >> 8) & 0xFF) / 255
        blue = Double(v & 0xFF) / 255
    }

    /// W3C perceived brightness; true means use dark text on this background.
    public var isLight: Bool {
        let r = red * 255
        let g = green * 255
        let b = blue * 255
        return (r * 299 + g * 587 + b * 114) / 1000 > 155
    }

    public var textOnColorHex: String {
        isLight ? "#000000" : "#FFFFFF"
    }
}

public enum CardAppearance {
    public static let fallbackBackground = "#333333"
    public static let accent = "#6C2DD7"
    public static let defaultCardColor = "#42A5F5"

    public static func resolveColor(cardColor: String?, brandPrimary: String?) -> String {
        if let cardColor, !cardColor.isEmpty { return cardColor }
        if let brandPrimary, !brandPrimary.isEmpty { return brandPrimary }
        return fallbackBackground
    }

    public static func resolveColor(_ card: FidelityCard, brands: BrandIndex?) -> String {
        let primary = card.logoSlug.flatMap { brands?.brand(slug: $0)?.primaryColor }
        return resolveColor(cardColor: card.color, brandPrimary: primary)
    }

    public static func textOnColor(_ hex: String) -> String {
        HexColor(hex: hex)?.textOnColorHex ?? "#FFFFFF"
    }

    public static func isLightColor(_ hex: String) -> Bool {
        HexColor(hex: hex)?.isLight ?? false
    }
}
