import SwiftUI
import TesseroneKit

struct CardFace: View {
    let card: FidelityCard
    let backgroundHex: String
    let logo: UIImage?

    var body: some View {
        let fg = Color(hex: CardAppearance.textOnColor(backgroundHex))
        ZStack(alignment: .topLeading) {
            Color(hex: backgroundHex)
            Group {
                if let logo {
                    Image(uiImage: logo)
                        .resizable()
                        .interpolation(.high)
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 160, height: 48, alignment: .leading)
                        .accessibilityLabel("\(card.name) logo")
                } else {
                    Text(card.name)
                        .font(Mono.font(.extraBold, size: 30))
                        .tracking(-1)
                        .foregroundStyle(fg)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
            }
            .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .clipped()
    }
}
