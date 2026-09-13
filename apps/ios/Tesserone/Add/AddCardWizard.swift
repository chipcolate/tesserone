import AVFoundation
import SwiftUI
import TesseroneKit
import UIKit

private enum WizardStep: Int, CaseIterable {
    case barcode, brand, finish
}

struct AddCardWizard: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette
    @Environment(\.dismiss) private var dismiss

    @State private var step: WizardStep = .barcode
    @State private var name = ""
    @State private var code = ""
    @State private var format: BarcodeFormat = .ean13
    @State private var color = CardAppearance.defaultCardColor
    @State private var notes = ""
    @State private var logoSlug: String?
    @State private var customLogoUri: String?
    @State private var scanStatus: ScanStatus = .idle
    @State private var pickedImage: UIImage?
    @State private var cameraOpen = false
    @State private var photoOpen = false
    @State private var logoPickerOpen = false
    @State private var permissionTitle = ""
    @State private var permissionBody = ""
    @State private var showPermission = false
    @State private var showInvalid = false
    @State private var showScanError = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var saving = false

    var body: some View {
        VStack(spacing: 0) {
            WizardProgress(
                stepIndex: step.rawValue,
                total: WizardStep.allCases.count,
                title: stepTitle,
                subtitle: stepSubtitle,
                indicator: model.t("add.stepIndicator", [
                    "current": String(step.rawValue + 1),
                    "total": String(WizardStep.allCases.count),
                ])
            )

            ScrollView {
                Group {
                    switch step {
                    case .barcode:
                        StepBarcode(
                            code: $code,
                            format: $format,
                            scanStatus: scanStatus,
                            pickedImage: pickedImage,
                            onScan: startScan,
                            onPhoto: { photoOpen = true }
                        )
                    case .brand:
                        StepBrand(
                            name: $name,
                            logoSlug: $logoSlug,
                            customLogoUri: $customLogoUri,
                            color: $color,
                            onPickLogo: { logoPickerOpen = true },
                            onClearLogo: clearCustomLogo
                        )
                    case .finish:
                        StepFinish(previewCard: previewCard, color: $color, notes: $notes)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)

            ActionBar {
                ChromeButton(
                    title: step == .barcode ? model.t("common.cancel") : model.t("common.back"),
                    variant: .secondary,
                    fill: true,
                    action: goBack
                )
                ChromeButton(
                    title: step == .finish ? model.t("add.save") : model.t("common.next"),
                    variant: .primary,
                    disabled: !canAdvance || saving,
                    fill: true,
                    action: goNext
                )
            }
        }
        .background(palette.bg.ignoresSafeArea())
        .task { consumePending() }
        .fullScreenCover(isPresented: $cameraOpen) {
            BarcodeScannerScreen(
                hint: model.t("add.scanHint"),
                onCode: { scanned, scannedFormat in
                    code = scanned
                    format = scannedFormat
                    cameraOpen = false
                },
                onCancel: { cameraOpen = false }
            )
        }
        .sheet(isPresented: $photoOpen) {
            PhotoLibraryPicker(
                onPicked: { image in
                    photoOpen = false
                    scanImage(image)
                },
                onCancel: { photoOpen = false }
            )
            .ignoresSafeArea()
        }
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
        .alert(permissionTitle, isPresented: $showPermission) {
            Button(model.t("common.openSettings")) { PermissionPrompt.openSettings() }
            Button(model.t("common.cancel"), role: .cancel) {}
        } message: {
            Text(permissionBody)
        }
        .alert(model.t("add.invalidBarcodeTitle"), isPresented: $showInvalid) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(model.t("add.invalidBarcodeBody", ["format": format.rawValue]))
        }
        .alert(model.t("add.scanErrorTitle"), isPresented: $showScanError) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(model.t("add.scanErrorBody"))
        }
        .alert(model.t("error.title"), isPresented: $showError) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private var stepTitle: String {
        switch step {
        case .barcode: return model.t("add.stepBarcodeTitle")
        case .brand: return model.t("add.stepBrandTitle")
        case .finish: return model.t("add.stepReviewTitle")
        }
    }

    private var stepSubtitle: String {
        switch step {
        case .barcode: return model.t("add.stepBarcodeSubtitle")
        case .brand: return model.t("add.stepBrandSubtitle")
        case .finish: return model.t("add.stepReviewSubtitle")
        }
    }

    private var canAdvance: Bool {
        switch step {
        case .barcode:
            return Barcode.validate(code, format: format)
        case .brand:
            return !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .finish:
            return true
        }
    }

    private var previewCard: FidelityCard {
        FidelityCard(
            id: "preview",
            name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? model.t("card.previewPlaceholder")
                : name.trimmingCharacters(in: .whitespacesAndNewlines),
            code: code.trimmingCharacters(in: .whitespacesAndNewlines),
            format: format,
            color: color,
            logoSlug: logoSlug,
            customLogoUri: customLogoUri,
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            sortIndex: 0,
            createdAt: "",
            updatedAt: ""
        )
    }

    private func goBack() {
        if step == .barcode {
            dismiss()
        } else if let prev = WizardStep(rawValue: step.rawValue - 1) {
            step = prev
        }
    }

    private func goNext() {
        switch step {
        case .barcode:
            if !Barcode.validate(code.trimmingCharacters(in: .whitespacesAndNewlines), format: format) {
                showInvalid = true
                return
            }
            step = .brand
        case .brand:
            step = .finish
        case .finish:
            save()
        }
    }

    private func save() {
        saving = true
        Task {
            do {
                try await model.addDraftCard(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    code: code.trimmingCharacters(in: .whitespacesAndNewlines),
                    format: format,
                    color: color,
                    logoSlug: logoSlug,
                    customLogoUri: customLogoUri,
                    notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
                )
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
                saving = false
            }
        }
    }

    private func startScan() {
        Task {
            let granted = await requestCamera()
            if granted { cameraOpen = true }
        }
    }

    private func requestCamera() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return true
        case .notDetermined:
            return await AVCaptureDevice.requestAccess(for: .video)
        case .denied, .restricted:
            permissionTitle = model.t("add.cameraPermissionBlockedTitle")
            permissionBody = model.t("add.cameraPermissionBlockedBody")
            showPermission = true
            return false
        @unknown default:
            return false
        }
    }

    private func scanImage(_ image: UIImage) {
        pickedImage = image
        scanStatus = .scanning
        DispatchQueue.global(qos: .userInitiated).async {
            let detections: [ImageBarcodeDetector.Detection]
            if let data = image.jpegData(compressionQuality: 0.95) {
                detections = ImageBarcodeDetector.detect(in: data)
            } else if let cg = image.cgImage {
                detections = ImageBarcodeDetector.detect(in: cg)
            } else {
                detections = []
            }
            DispatchQueue.main.async {
                if let hit = detections.first {
                    let fixed = hit.fixed
                    code = fixed.code
                    format = fixed.format
                    pickedImage = nil
                    scanStatus = .idle
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                } else {
                    scanStatus = .notFound
                }
            }
        }
    }

    private func applyCustomLogo(_ image: UIImage) {
        do {
            if let previous = customLogoUri { model.removeCustomLogo(previous) }
            customLogoUri = try model.writeCustomLogo(image)
            logoSlug = nil
        } catch {
            permissionTitle = model.t("logoSelector.photoPickErrorTitle")
            permissionBody = error.localizedDescription
            showPermission = true
        }
    }

    private func clearCustomLogo() {
        if let previous = customLogoUri { model.removeCustomLogo(previous) }
        customLogoUri = nil
    }

    private func consumePending() {
        guard let pending = model.consumePendingScan() else { return }
        if let pendingCode = pending.code {
            code = pendingCode
            if let pendingFormat = pending.format { format = pendingFormat }
        }
        if let url = pending.imageURL, let data = try? Data(contentsOf: url), let image = UIImage(data: data) {
            scanImage(image)
        }
    }
}

private extension String {
    var nilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
