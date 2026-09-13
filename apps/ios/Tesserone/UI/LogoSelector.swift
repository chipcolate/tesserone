import SwiftUI
import TesseroneKit

struct LogoSelector: View {
    var logoSlug: String?
    var customLogoUri: String?
    var cardName: String
    var cardColor: String
    var onPick: () -> Void
    var onClear: () -> Void

    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        let brand = logoSlug.flatMap { model.brandIndex?.brand(slug: $0) }
        let hasLogo = logoSlug != nil || customLogoUri != nil
        let preview = model.catalog.logo(for: FidelityCard(
            id: "preview-logo",
            name: cardName,
            code: "",
            format: .code128,
            color: cardColor,
            logoSlug: logoSlug,
            customLogoUri: customLogoUri,
            sortIndex: 0,
            createdAt: "",
            updatedAt: ""
        ))

        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                ZStack {
                    Color(hex: cardColor)
                    if let preview {
                        Image(uiImage: preview)
                            .resizable()
                            .interpolation(.high)
                            .aspectRatio(contentMode: .fit)
                            .padding(4)
                    } else {
                        Text(initial)
                            .font(Mono.font(.extraBold, size: 22))
                            .foregroundStyle(Color(hex: CardAppearance.textOnColor(cardColor)))
                    }
                }
                .frame(width: 48, height: 48)
                .overlay(
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .stroke(palette.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(brand?.name ?? (customLogoUri != nil ? model.t("logoSelector.customLogo") : model.t("logoSelector.noLogo")))
                        .font(TypeRole.label())
                        .foregroundStyle(palette.text)
                        .lineLimit(1)
                    if hasLogo {
                        Button(model.t("common.remove"), action: onClear)
                            .font(TypeRole.caption())
                            .foregroundStyle(palette.danger)
                            .buttonStyle(.plain)
                    }
                }
                Spacer()
            }

            Button(action: onPick) {
                Text(customLogoUri != nil ? model.t("logoSelector.replacePhoto") : model.t("logoSelector.uploadPhoto"))
                    .font(Mono.font(.medium, size: 14))
                    .foregroundStyle(palette.text)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(palette.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                            .stroke(palette.border, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
    }

    private var initial: String {
        let trimmed = cardName.trimmingCharacters(in: .whitespacesAndNewlines)
        if let ch = trimmed.first { return String(ch).uppercased() }
        return "?"
    }
}
