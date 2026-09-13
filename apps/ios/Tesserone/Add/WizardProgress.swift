import SwiftUI

struct WizardProgress: View {
    var stepIndex: Int
    var total: Int
    var title: String
    var subtitle: String
    var indicator: String
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                ForEach(0..<total, id: \.self) { i in
                    Rectangle()
                        .fill(i <= stepIndex ? palette.accent : palette.border)
                        .frame(height: 4)
                }
            }
            .padding(.bottom, 8)

            Text(indicator)
                .font(Mono.font(.bold, size: 11))
                .tracking(1.2)
                .textCase(.uppercase)
                .foregroundStyle(palette.textSecondary)
            Text(title)
                .font(Mono.font(.bold, size: 24))
                .foregroundStyle(palette.text)
            Text(subtitle)
                .font(TypeRole.caption())
                .foregroundStyle(palette.textSecondary)
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 14)
        .overlay(alignment: .bottom) {
            Rectangle().fill(palette.border).frame(height: 1)
        }
    }
}
