import SwiftUI
import TesseroneKit
import WidgetKit

struct CardLogoContent: View {
    let card: WatchSnapshotCard
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

struct CardTile: View {
    let card: WatchSnapshotCard

    var body: some View {
        let bg = Color(hex: card.color) ?? .gray
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
