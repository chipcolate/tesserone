import SwiftUI
import WidgetKit

/// The logo image (or a monospace initial fallback) for a card, drawn on top of
/// a known background color. No background of its own.
///
/// The fallback uses the system monospaced face rather than the app's bundled
/// JetBrains Mono on purpose: this runs in the widget extension process, where
/// the app's JS-registered UI font isn't available, and matches the Apple Watch
/// companion (also system monospaced). See CardWidgets.tsx for the Android side.
struct CardLogoContent: View {
    let card: WidgetCard
    let bg: Color
    var initialSize: CGFloat = 24

    var body: some View {
        if let ui = SharedStore.logoImage(for: card) {
            Image(uiImage: ui)
                .resizable()
                .aspectRatio(contentMode: .fit)
        } else {
            Text(String(card.name.prefix(1)).uppercased())
                .font(.system(size: initialSize, weight: .bold, design: .monospaced))
                .foregroundColor(bg.readableForeground)
                .minimumScaleFactor(0.5)
        }
    }
}

/// A self-contained, tappable colored card tile used by the list widget.
struct CardTile: View {
    let card: WidgetCard

    var body: some View {
        let bg = Color(hex: card.color) ?? .gray
        // Squared to match the app's Raw Aesthetic (theme/geometry.ts TILE_RADIUS = 2),
        // even though iOS forces a rounded outer widget container.
        Link(destination: SharedStore.openURL(for: card) ?? fallbackURL) {
            ZStack {
                RoundedRectangle(cornerRadius: 2, style: .continuous).fill(bg)
                CardLogoContent(card: card, bg: bg, initialSize: 20)
                    .padding(9)
            }
        }
    }

    private var fallbackURL: URL { URL(string: "tesserone://")! }
}

/// Shown when there are no cards to display (none synced, or none configured).
struct EmptyWidgetView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text(verbatim: "TESSERONE")
                .font(.system(size: 12, weight: .bold, design: .monospaced))
            Text("Add a card in Tesserone")
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
