import SwiftUI
import TesseroneKit

struct StepFinish: View {
    var previewCard: FidelityCard
    @Binding var color: String
    @Binding var notes: String

    @EnvironmentObject private var model: AppModel

    var body: some View {
        let bg = model.catalog.backgroundHex(for: previewCard)
        let logo = model.catalog.logo(for: previewCard)
        VStack(alignment: .leading, spacing: 0) {
            CardFace(card: previewCard, backgroundHex: bg, logo: logo)
                .frame(height: 150)
                .clipShape(RoundedRectangle(cornerRadius: RawGeometry.cardRadius, style: .continuous))
            CardBack(card: previewCard, backgroundHex: bg)
                .frame(height: 300)
                .clipShape(RoundedRectangle(cornerRadius: RawGeometry.cardRadius, style: .continuous))
                .padding(.top, 12)

            FieldLabel(text: model.t("add.labelColor"))
                .padding(.top, 24)
            ColorGrid(color: $color)
                .padding(.top, 6)

            FieldLabel(text: model.t("add.labelNotes"))
                .padding(.top, 24)
            MonoField(
                text: $notes,
                placeholder: model.t("add.placeholderNotes"),
                axis: .vertical
            )
            .padding(.top, 6)
        }
    }
}
