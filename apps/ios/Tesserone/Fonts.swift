import CoreText
import SwiftUI
import UIKit

/// JetBrains Mono faces from `shared/fonts`. Weight is the PostScript name —
/// never apply `fontWeight` / `UIFont.Weight` on a single family.
enum Mono {
    enum Face {
        case regular, medium, bold, extraBold

        var postScript: String {
            switch self {
            case .regular: return "JetBrainsMono-Regular"
            case .medium: return "JetBrainsMono-Medium"
            case .bold: return "JetBrainsMono-Bold"
            case .extraBold: return "JetBrainsMono-ExtraBold"
            }
        }

        var fileName: String { postScript }
    }

    static func font(_ face: Face, size: CGFloat) -> Font {
        Font.custom(face.postScript, size: size)
    }

    static func uiFont(_ face: Face, size: CGFloat) -> UIFont {
        UIFont(name: face.postScript, size: size) ?? UIFont.systemFont(ofSize: size)
    }

    static func register() {
        let names = [Face.regular, .medium, .bold, .extraBold]
        let bundle = Bundle.main
        for face in names {
            let url = bundle.url(forResource: face.fileName, withExtension: "ttf", subdirectory: "fonts")
                ?? bundle.url(forResource: face.fileName, withExtension: "ttf")
            if let url {
                CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
            }
        }
    }
}

enum TypeRole {
    static func title() -> Font { Mono.font(.bold, size: 28) }
    static func cardName() -> Font { Mono.font(.medium, size: 18) }
    static func barcode() -> Font { Mono.font(.regular, size: 16) }
    static func body() -> Font { Mono.font(.regular, size: 16) }
    static func label() -> Font { Mono.font(.regular, size: 14) }
    static func sectionHeader() -> Font { Mono.font(.bold, size: 13) }
    static func caption() -> Font { Mono.font(.regular, size: 12) }
    static func chromeButton() -> Font { Mono.font(.bold, size: 14) }
}
