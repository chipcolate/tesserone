import SwiftUI

struct BarcodeView: View {
    let card: WatchSnapshotCard

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()
            VStack(spacing: 6) {
                BarcodeRenderer(code: card.code, format: card.format)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(8)
                Text(card.code)
                    .font(.caption2.monospaced())
                    .foregroundStyle(.black)
                    .lineLimit(1)
                    .truncationMode(.middle)
                    .padding(.bottom, 4)
            }
        }
        .navigationTitle(card.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
