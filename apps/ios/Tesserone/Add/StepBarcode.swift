import SwiftUI
import TesseroneKit

enum ScanStatus: Equatable {
    case idle
    case scanning
    case notFound
}

struct StepBarcode: View {
    @Binding var code: String
    @Binding var format: BarcodeFormat
    var scanStatus: ScanStatus
    var pickedImage: UIImage?
    var onScan: () -> Void
    var onPhoto: () -> Void

    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette
    @State private var manualOpen = false
    @FocusState private var codeFocused: Bool

    private var showEntry: Bool { manualOpen || !code.isEmpty }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            methodTile(
                title: model.t("add.methodScanTitle"),
                hint: model.t("add.methodScanHint"),
                action: onScan
            )
            methodTile(
                title: model.t("add.methodPhotoTitle"),
                hint: model.t("add.methodPhotoHint"),
                action: onPhoto
            )
            methodTile(
                title: model.t("add.methodTypeTitle"),
                hint: model.t("add.methodTypeHint"),
                action: openManual
            )

            if scanStatus == .scanning {
                Text(model.t("add.scanningImage"))
                    .font(TypeRole.body())
                    .foregroundStyle(palette.text)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(palette.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                            .stroke(palette.border, lineWidth: 1)
                    )
                    .padding(.top, 6)
            }

            if scanStatus == .notFound, let pickedImage {
                HStack(spacing: 12) {
                    Image(uiImage: pickedImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 64, height: 64)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                    Text(model.t("add.scanNotFound"))
                        .font(TypeRole.body())
                        .foregroundStyle(palette.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(12)
                .background(palette.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .stroke(palette.border, lineWidth: 1)
                )
                .padding(.top, 6)
            }

            if showEntry {
                FieldLabel(text: model.t("add.labelBarcode"))
                    .padding(.top, 14)
                MonoField(text: $code, placeholder: model.t("add.placeholderBarcode"))
                    .focused($codeFocused)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.asciiCapable)

                FieldLabel(text: model.t("add.labelFormat"))
                    .padding(.top, 8)
                FormatChipRow(format: $format)
            }
        }
    }

    private func openManual() {
        manualOpen = true
        DispatchQueue.main.async { codeFocused = true }
    }

    private func methodTile(title: String, hint: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Mono.font(.bold, size: 16))
                    .foregroundStyle(palette.text)
                Text(hint)
                    .font(TypeRole.caption())
                    .foregroundStyle(palette.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(minHeight: 64)
            .background(palette.surface)
            .overlay(
                RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                    .stroke(palette.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
