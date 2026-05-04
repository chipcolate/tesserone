import SwiftUI

struct CardRowView: View {
    let card: WatchSnapshotCard

    var body: some View {
        HStack(spacing: 10) {
            LogoThumbnail(card: card)
                .frame(width: 32, height: 32)
            Text(card.name)
                .font(.body)
                .lineLimit(1)
                .truncationMode(.tail)
        }
        .padding(.vertical, 2)
    }
}

private struct LogoThumbnail: View {
    let card: WatchSnapshotCard
    @EnvironmentObject private var logoCache: LogoCache

    var body: some View {
        if let logoKey = card.logoKey,
           let url = logoCache.url(for: logoKey),
           let img = UIImage(contentsOfFile: url.path) {
            Image(uiImage: img)
                .resizable()
                .scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 6))
        } else {
            ColoredInitial(card: card)
        }
    }
}

private struct ColoredInitial: View {
    let card: WatchSnapshotCard

    private var background: Color {
        Color(hex: card.color) ?? .gray
    }

    private var initial: String {
        guard let first = card.name.first else { return "?" }
        return String(first).uppercased()
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6).fill(background)
            Text(initial)
                .font(.caption.weight(.bold))
                .foregroundStyle(background.readableForeground)
        }
    }
}
