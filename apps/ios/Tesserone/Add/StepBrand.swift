import SwiftUI
import TesseroneKit

struct StepBrand: View {
    @Binding var name: String
    @Binding var logoSlug: String?
    @Binding var customLogoUri: String?
    @Binding var color: String
    var onPickLogo: () -> Void
    var onClearLogo: () -> Void

    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette
    @State private var query = ""

    private var results: [BrandEntry] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        return model.brandIndex?.search(trimmed) ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            FieldLabel(text: model.t("add.brandSearchLabel"))
            HStack(spacing: 10) {
                Text("⌕")
                    .font(Mono.font(.regular, size: 22))
                    .foregroundStyle(palette.textSecondary)
                TextField(model.t("add.brandSearchPlaceholder"), text: $query)
                    .font(TypeRole.body())
                    .foregroundStyle(palette.text)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
            .padding(.horizontal, 14)
            .frame(height: 52)
            .background(palette.surface)
            .overlay(
                RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                    .stroke(palette.border, lineWidth: 1)
            )
            .padding(.top, 6)

            if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && results.isEmpty {
                Text(model.t("add.brandNoResults"))
                    .font(TypeRole.caption())
                    .foregroundStyle(palette.textSecondary)
                    .padding(.top, 10)
            }

            if !results.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(results.enumerated()), id: \.element.slug) { idx, brand in
                        Button {
                            select(brand)
                        } label: {
                            HStack(spacing: 12) {
                                brandTile(brand)
                                Text(brand.name)
                                    .font(TypeRole.label())
                                    .foregroundStyle(palette.text)
                                    .lineLimit(1)
                                Spacer()
                                if brand.slug == logoSlug {
                                    Text("✓")
                                        .font(TypeRole.label())
                                        .foregroundStyle(palette.accent)
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(brand.slug == logoSlug ? palette.bg : palette.surface)
                        }
                        .buttonStyle(.plain)
                        if idx < results.count - 1 {
                            Rectangle().fill(palette.border).frame(height: 1)
                        }
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .stroke(palette.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                .padding(.top, 12)
            }

            Rectangle()
                .fill(palette.border)
                .frame(height: 1)
                .padding(.top, 24)
                .padding(.bottom, 16)

            FieldLabel(text: model.t("add.brandCustomTitle"))
            Text(model.t("add.brandCustomHint"))
                .font(TypeRole.caption())
                .foregroundStyle(palette.textSecondary)
                .padding(.top, 4)
                .padding(.bottom, 10)
            MonoField(
                text: $name,
                placeholder: model.t("add.placeholderName"),
                autoCapitalize: .words
            )
            LogoSelector(
                logoSlug: logoSlug,
                customLogoUri: customLogoUri,
                cardName: name,
                cardColor: color,
                onPick: onPickLogo,
                onClear: {
                    onClearLogo()
                    logoSlug = nil
                }
            )
            .padding(.top, 16)
        }
    }

    private func select(_ brand: BrandEntry) {
        name = brand.name
        onClearLogo()
        logoSlug = brand.slug
        color = brand.primaryColor
        query = ""
    }

    @ViewBuilder
    private func brandTile(_ brand: BrandEntry) -> some View {
        let image = LogoCatalog.bundledLogo(named: brand.logo)
        ZStack {
            Color(hex: brand.primaryColor)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .interpolation(.high)
                    .aspectRatio(contentMode: .fit)
                    .padding(4)
            } else {
                Text(String(brand.name.prefix(1)).uppercased())
                    .font(Mono.font(.extraBold, size: 18))
                    .foregroundStyle(Color(hex: CardAppearance.textOnColor(brand.primaryColor)))
            }
        }
        .frame(width: 40, height: 40)
        .overlay(
            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                .stroke(palette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
    }
}
