import SwiftUI
import TesseroneKit
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette
    @Environment(\.dismiss) private var dismiss

    @State private var languagePickerOpen = false
    @State private var exporting = false
    @State private var importing = false
    @State private var shareURL: URL?
    @State private var showShare = false
    @State private var importerOpen = false
    @State private var pendingImport: ImportResult?
    @State private var conflictCount = 0
    @State private var showConflicts = false
    @State private var alertTitle = ""
    @State private var alertBody = ""
    @State private var showAlert = false
    @State private var showDeleteAll = false
    @State private var showTutorialReset = false

    var body: some View {
        VStack(spacing: 0) {
            Text(model.t("settings.title"))
                .font(TypeRole.cardName())
                .foregroundStyle(palette.text)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 16)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(palette.border).frame(height: 1)
                }

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    sectionLabel(model.t("settings.sectionTheme"))
                    themeSegment
                        .padding(.top, 8)

                    sectionLabel(model.t("settings.sectionLanguage"))
                        .padding(.top, 24)
                    Panel {
                        Button { languagePickerOpen = true } label: {
                            settingsRow(languageLabel(model.language), trailing: "›")
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.top, 8)

                    sectionLabel(model.t("settings.sectionData"))
                        .padding(.top, 24)
                    Panel {
                        Button { exportWallet() } label: {
                            settingsRow(
                                model.t("settings.exportCards"),
                                trailing: exporting ? nil : model.t("settings.cardCount", count: model.cards.count)
                            )
                        }
                        .buttonStyle(.plain)
                        .disabled(exporting)
                        divider
                        Button { importerOpen = true } label: {
                            settingsRow(model.t("settings.importCards"), trailing: importing ? "…" : nil)
                        }
                        .buttonStyle(.plain)
                        .disabled(importing)
                        divider
                        Button { replayTutorial() } label: {
                            settingsRow(model.t("settings.replayTutorial"))
                        }
                        .buttonStyle(.plain)
                        divider
                        Button { showDeleteAll = true } label: {
                            settingsRow(model.t("settings.deleteAll"), color: palette.danger)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.top, 8)

                    sectionLabel(model.t("settings.sectionAbout"))
                        .padding(.top, 24)
                    Panel {
                        settingsRow(
                            "Tesserone",
                            trailing: model.t("settings.aboutVersion", ["version": "2.0.0"])
                        )
                        divider
                        Text(model.t("settings.aboutTagline"))
                            .font(TypeRole.caption())
                            .foregroundStyle(palette.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        divider
                        Text(model.t("settings.aboutDisclaimer"))
                            .font(TypeRole.caption())
                            .foregroundStyle(palette.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)

            ActionBar {
                ChromeButton(title: model.t("common.done"), variant: .primary, fill: true, action: { dismiss() })
            }
        }
        .background(palette.bg.ignoresSafeArea())
        .overlay {
            if languagePickerOpen {
                BottomSheet(title: model.t("settings.sectionLanguage"), onClose: { languagePickerOpen = false }) {
                    ForEach(Array(LanguagePreference.allCases.enumerated()), id: \.element) { idx, pref in
                        Button {
                            model.setLanguage(pref)
                            languagePickerOpen = false
                        } label: {
                            settingsRow(
                                languageLabel(pref),
                                trailing: model.language == pref ? "✓" : nil,
                                trailingColor: palette.accent
                            )
                        }
                        .buttonStyle(.plain)
                        if idx < LanguagePreference.allCases.count - 1 {
                            divider
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showShare) {
            if let shareURL {
                ActivityShareSheet(items: [shareURL]) { showShare = false }
            }
        }
        .fileImporter(
            isPresented: $importerOpen,
            allowedContentTypes: [.json, .plainText],
            allowsMultipleSelection: false
        ) { result in
            handleImport(result)
        }
        .confirmationDialog(
            model.t("settings.conflictsFound"),
            isPresented: $showConflicts,
            titleVisibility: .visible
        ) {
            Button(model.t("settings.conflictKeepExisting")) { applyPending(.keepExisting) }
            Button(model.t("settings.conflictUseImported")) { applyPending(.useImported) }
            Button(model.t("settings.conflictKeepNewer")) { applyPending(.keepNewer) }
            Button(model.t("common.cancel"), role: .cancel) { pendingImport = nil }
        } message: {
            Text(model.t("settings.conflictsFoundBody", count: conflictCount))
        }
        .alert(model.t("settings.deleteAllTitle"), isPresented: $showDeleteAll) {
            Button(model.t("common.cancel"), role: .cancel) {}
            Button(model.t("settings.deleteAllConfirm"), role: .destructive) { model.deleteAllCards() }
        } message: {
            Text(model.t("settings.deleteAllBody", count: model.cards.count))
        }
        .alert(model.t("settings.tutorialResetTitle"), isPresented: $showTutorialReset) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(model.t("settings.tutorialResetBody"))
        }
        .alert(alertTitle, isPresented: $showAlert) {
            Button(model.t("common.done"), role: .cancel) {}
        } message: {
            Text(alertBody)
        }
    }

    private var themeSegment: some View {
        HStack(spacing: 3) {
            ForEach([ThemeMode.system, .light, .dark], id: \.self) { mode in
                let selected = model.themeMode == mode
                Button {
                    model.setThemeMode(mode)
                } label: {
                    Text(themeLabel(mode))
                        .font(Mono.font(selected ? .bold : .regular, size: 14))
                        .foregroundStyle(
                            selected
                                ? Color(hex: CardAppearance.textOnColor(CardAppearance.accent))
                                : palette.text
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(selected ? palette.accent : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius - 1, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                .stroke(palette.border, lineWidth: 1)
        )
    }

    private var divider: some View {
        Rectangle().fill(palette.border).frame(height: 1)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(TypeRole.sectionHeader())
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundStyle(palette.textSecondary)
            .padding(.top, 8)
    }

    private func settingsRow(
        _ title: String,
        trailing: String? = nil,
        color: Color? = nil,
        trailingColor: Color? = nil
    ) -> some View {
        HStack {
            Text(title)
                .font(TypeRole.body())
                .foregroundStyle(color ?? palette.text)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(TypeRole.caption())
                    .foregroundStyle(trailingColor ?? palette.textSecondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    private func themeLabel(_ mode: ThemeMode) -> String {
        switch mode {
        case .system: return model.t("settings.themeSystem")
        case .light: return model.t("settings.themeLight")
        case .dark: return model.t("settings.themeDark")
        }
    }

    private func languageLabel(_ pref: LanguagePreference) -> String {
        if pref == .system { return model.t("settings.languageSystem") }
        return LanguageLabels.native(pref)
    }

    private func exportWallet() {
        exporting = true
        defer { exporting = false }
        do {
            let data = try model.exportWalletData()
            let name = "tesserone-backup-\(ISODate.now().prefix(10)).json"
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(String(name))
            try data.write(to: url, options: .atomic)
            shareURL = url
            showShare = true
        } catch {
            alertTitle = model.t("settings.exportFailed")
            alertBody = error.localizedDescription
            showAlert = true
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            if error is CancellationError { return }
            let ns = error as NSError
            if ns.domain == NSCocoaErrorDomain && ns.code == NSUserCancelledError { return }
            alertTitle = model.t("settings.importFailed")
            alertBody = error.localizedDescription
            showAlert = true
        case .success(let urls):
            guard let url = urls.first else { return }
            importing = true
            defer { importing = false }
            do {
                let parsed = try model.parseImport(from: url)
                let existing = Dictionary(uniqueKeysWithValues: model.cards.map { ($0.id, $0) })
                let conflicts = ImportExport.detectConflicts(existing: existing, imported: parsed.cards)
                if conflicts == 0 {
                    Task {
                        do {
                            try await model.mergeImported(parsed.cards, strategy: .keepNewer)
                            alertTitle = model.t("settings.importComplete")
                            alertBody = model.t("settings.importCompleteBody", count: parsed.cards.count)
                            showAlert = true
                        } catch {
                            alertTitle = model.t("settings.importFailed")
                            alertBody = error.localizedDescription
                            showAlert = true
                        }
                    }
                } else {
                    pendingImport = parsed
                    conflictCount = conflicts
                    showConflicts = true
                }
            } catch {
                alertTitle = model.t("settings.importFailed")
                alertBody = error.localizedDescription
                showAlert = true
            }
        }
    }

    private func applyPending(_ strategy: MergeStrategy) {
        guard let pending = pendingImport else { return }
        pendingImport = nil
        Task {
            do {
                try await model.mergeImported(pending.cards, strategy: strategy)
                alertTitle = model.t("settings.importComplete")
                alertBody = model.t("settings.importCompleteBody", count: pending.cards.count)
                showAlert = true
            } catch {
                alertTitle = model.t("settings.importFailed")
                alertBody = error.localizedDescription
                showAlert = true
            }
        }
    }

    private func replayTutorial() {
        model.resetTutorial()
        showTutorialReset = true
    }
}
