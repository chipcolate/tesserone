import SwiftUI
import TesseroneKit

private let backPadding: CGFloat = 24
private let tilePadding: CGFloat = 16

struct CardBack: View {
    let card: FidelityCard
    let backgroundHex: String

    var body: some View {
        let fg = Color(hex: CardAppearance.textOnColor(backgroundHex))
        VStack(spacing: 0) {
            barcodeTile
            Spacer(minLength: 12)
            VStack(spacing: 10) {
                Text(card.name)
                    .font(Mono.font(.medium, size: 18))
                    .tracking(-0.2)
                    .foregroundStyle(fg)
                    .lineLimit(1)
                Text(card.code)
                    .font(Mono.font(.regular, size: 16))
                    .tracking(1.5)
                    .foregroundStyle(fg.opacity(0.7))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if let notes = card.notes, !notes.isEmpty {
                    Text(notes)
                        .font(Mono.font(.regular, size: 12))
                        .foregroundStyle(fg.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .frame(maxWidth: .infinity)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(backPadding)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: backgroundHex))
    }

    @ViewBuilder
    private var barcodeTile: some View {
        let is2D = Barcode.isTwoDimensional(card.format)
        ZStack {
            Color.white
            barcodeContent(is2D: is2D)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 140)
        .frame(height: is2D ? 252 : 162)
        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.tileRadius, style: .continuous))
    }

    @ViewBuilder
    private func barcodeContent(is2D: Bool) -> some View {
        if is2D {
            if let image = CoreImageBarcode.image(code: card.code, format: card.format) {
                Image(uiImage: image)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: card.format == .pdf417 ? nil : 220, height: card.format == .pdf417 ? 120 : 220)
                    .padding(tilePadding)
            } else {
                errorLabel
            }
        } else if let pattern = Barcode.linearModules(card.code, format: card.format) {
            OneDimBarcodeView(pattern: pattern)
                .frame(height: 130)
                .padding(tilePadding)
        } else if let image = CoreImageBarcode.image(code: card.code, format: .code128) {
            Image(uiImage: image)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .frame(height: 130)
                .padding(tilePadding)
        } else {
            errorLabel
        }
    }

    private var errorLabel: some View {
        Text("Could not render barcode")
            .font(Mono.font(.regular, size: 14))
            .foregroundStyle(Color(hex: "#999999"))
            .padding(tilePadding)
    }
}
