import SwiftUI
import TesseroneKit
import UIKit

struct EditCardView: View {
    let card: FidelityCard

    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette
    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var code: String
    @State private var format: BarcodeFormat
    @State private var color: String
    @State private var notes: String
    @State private var logoSlug: String?
    @State private var customLogoUri: String?
    @State private var originalCustomLogoUri: String?
    @State private var brandQueryResults: [BrandEntry] = []
    @State private var logoPickerOpen = false
    @State private var shareURL: URL?
    @State private var showShare = false
    @State private var showDeleteConfirm = false
    @State private var showMissingName = false
    @State private var showInvalid = false
    @State private var alertTitle = ""
    @State private var alertBody = ""
    @State private var showAlert = false

    init(card: FidelityCard) {
        self.card = card
        _name = State(initialValue: card.name)
        _code = State(initialValue: card.code)
        _format = State(initialValue: card.format)
        _color = State(initialValue: card.color ?? CardAppearance.defaultCardColor)
        _notes = State(initialValue: card.notes ?? "")
        _logoSlug = State(initialValue: card.logoSlug)
        _customLogoUri = State(initialValue: card.customLogoUri)
        _originalCustomLogoUri = State(initialValue: card.customLogoUri)
    }

    var body: some View {
        VStack(spacing: 0) {
            Text(model.t("card.title"))
                .font(TypeRole.cardName())
                .foregroundStyle(palette.text)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 12)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(palette.border).frame(height: 1)
                }

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    preview
                        .padding(.top, 12)
                        .padding(.bottom, 8)

                    FieldLabel(text: model.t("card.labelName"))
                        .padding(.top, 16)
                    MonoField(
                        text: $name,
                        placeholder: model.t("card.placeholderName"),
                        autoCapitalize: .words
                    )
                    .onChange(of: name) { _, text in
                        brandQueryResults = model.brandIndex?.search(text) ?? []
                    }

                    if !brandQueryResults.isEmpty {
                        brandResults
                            .padding(.top, 8)
                    }

                    FieldLabel(text: model.t("card.labelLogo"))
                        .padding(.top, 16)
                    LogoSelector(
                        logoSlug: logoSlug,
                        customLogoUri: customLogoUri,
                        cardName: name,
                        cardColor: color,
                        onPick: { logoPickerOpen = true },
                        onClear: clearLogo
                    )
                    .padding(.top, 6)

                    FieldLabel(text: model.t("card.labelBarcode"))
                        .padding(.top, 16)
                    MonoField(text: $code, placeholder: model.t("card.placeholderBarcode"))

                    FieldLabel(text: model.t("card.labelFormat"))
                        .padding(.top, 16)
                    FormatChipRow(format: $format)
                        .padding(.top, 6)

                    FieldLabel(text: model.t("card.labelColor"))
                        .padding(.top, 16)
                    ColorGrid(color: $color)
                        .padding(.top, 6)

                    FieldLabel(text: model.t("card.labelNotes"))
                        .padding(.top, 16)
                    MonoField(
                        text: $notes,
                        placeholder: model.t("card.placeholderNotes"),
                        axis: .vertical
                    )
                    .padding(.top, 6)

                    Text(model.t("card.timestamps", [
                        "created": formatCardDate(card.createdAt, language: model.resolvedLanguage),
                        "updated": formatCardDate(card.updatedAt, language: model.resolvedLanguage),
                    ]))
                    .font(TypeRole.caption())
                    .foregroundStyle(palette.textSecondary)
                    .padding(.top, 16)

                    ChromeButton(title: model.t("card.share"), variant: .ghost, fill: true, action: share)
                        .padding(.top, 24)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)

            ActionBar {
                ChromeButton(title: model.t("common.delete"), variant: .danger, action: { showDeleteConfirm = true })
                Spacer(minLength: 0)
                ChromeButton(title: model.t("common.cancel"), variant: .secondary, action: cancel)
                ChromeButton(title: model.t("common.save"), variant: .primary, action: save)
            }
        }
        .background(palette.bg.ignoresSafeArea())
        .sheet(isPresented: $logoPickerOpen) {
            PhotoLibraryPicker(
                onPicked: { image in
                    logoPickerOpen = false
                    applyCustomLogo(image)
                },
                onCancel: { logoPickerOpen = false }
            )
            .ignoresSafeArea()
        }
        .sheet(isPresented: $showShare) {
            if let shareURL {
                ActivityShareSheet(items: [shareURL]) {
                    showShare = false
                }
            }
        }
        .alert(model.t("card.deleteConfirmTitle"), isPresented: $showDeleteConfirm) {
            Button(model.t("common.cancel"), role: .cancel) {}
            Button(model.t("common.delete"), role: .destructive, action: deleteCard)
        } message: {
            Text(model.t("card.deleteConfirmBody", ["name": card.name]))
        }
        .alert(model.t("card.missingNameTitle"), isPresented: $showMissingName) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(model.t("card.missingNameBody"))
        }
        .alert(model.t("add.invalidBarcodeTitle"), isPresented: $showInvalid) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(model.t("add.invalidBarcodeBody", ["format": format.rawValue]))
        }
        .alert(alertTitle, isPresented: $showAlert) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(alertBody)
        }
        .onAppear {
            if logoSlug == nil, !card.name.isEmpty {
                brandQueryResults = model.brandIndex?.search(card.name) ?? []
            }
        }
    }

    private var preview: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(name.isEmpty ? model.t("card.previewPlaceholder") : name)
                .font(TypeRole.title())
                .foregroundStyle(Color(hex: CardAppearance.textOnColor(color)))
                .lineLimit(1)
            if !code.isEmpty {
                Text(code)
                    .font(TypeRole.barcode())
                    .foregroundStyle(Color(hex: CardAppearance.textOnColor(color)).opacity(0.7))
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(20)
        .frame(maxWidth: .infinity, minHeight: 120, alignment: .leading)
        .background(Color(hex: color))
        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.cardRadius, style: .continuous))
    }

    private var brandResults: some View {
        VStack(spacing: 0) {
            ForEach(Array(brandQueryResults.enumerated()), id: \.element.slug) { idx, brand in
                Button {
                    selectBrand(brand)
                } label: {
                    HStack {
                        Text(brand.name)
                            .font(TypeRole.label())
                            .foregroundStyle(palette.text)
                        Spacer()
                        if brand.slug == logoSlug {
                            Text("✓").foregroundStyle(palette.accent)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(brand.slug == logoSlug ? palette.bg : palette.surface)
                }
                .buttonStyle(.plain)
                if idx < brandQueryResults.count - 1 {
                    Rectangle().fill(palette.border).frame(height: 1)
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                .stroke(palette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
    }

    private func selectBrand(_ brand: BrandEntry) {
        name = brand.name
        logoSlug = brand.slug
        discardDraftLogo()
        customLogoUri = nil
        color = brand.primaryColor
        brandQueryResults = []
    }

    private func applyCustomLogo(_ image: UIImage) {
        do {
            discardDraftLogo()
            customLogoUri = try model.writeCustomLogo(image)
            logoSlug = nil
            brandQueryResults = []
        } catch {
            alertTitle = model.t("logoSelector.photoPickErrorTitle")
            alertBody = error.localizedDescription
            showAlert = true
        }
    }

    private func clearLogo() {
        discardDraftLogo()
        customLogoUri = nil
        logoSlug = nil
        brandQueryResults = []
    }

    private func discardDraftLogo() {
        if let uri = customLogoUri, uri != originalCustomLogoUri {
            model.removeCustomLogo(uri)
        }
    }

    private func cancel() {
        discardDraftLogo()
        dismiss()
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.isEmpty {
            showMissingName = true
            return
        }
        let trimmedCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
        if !Barcode.validate(trimmedCode, format: format) {
            showInvalid = true
            return
        }
        if let prev = originalCustomLogoUri, prev != customLogoUri {
            model.removeCustomLogo(prev)
        }
        var updated = card
        updated.name = trimmedName
        updated.code = trimmedCode
        updated.format = format
        updated.color = color
        updated.logoSlug = logoSlug
        updated.customLogoUri = customLogoUri
        updated.notes = notes.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        model.updateCard(updated)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        dismiss()
    }

    private func deleteCard() {
        discardDraftLogo()
        let snapshot = card
        model.deleteCard(card)
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        dismiss()
        model.showToast(
            message: model.t("card.deletedToast", ["name": snapshot.name]),
            actionLabel: model.t("common.undo"),
            onAction: { model.restoreCard(snapshot) }
        )
    }

    private func share() {
        do {
            let data = try model.shareCardData(card)
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(exportFileName(cardName: card.name))
            try data.write(to: url, options: .atomic)
            shareURL = url
            showShare = true
        } catch {
            alertTitle = model.t("card.shareFailed")
            alertBody = error.localizedDescription
            showAlert = true
        }
    }
}

private extension String {
    var nilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
