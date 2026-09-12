import SwiftUI
import TesseroneKit

struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var bridge = CardStackBridge()
    @State private var fabOpen = false
    @State private var sortSheet = false
    @State private var showAdd = false
    @State private var showSettings = false
    @State private var editCard: FidelityCard?
    @State private var fabFrame: CGRect = .zero
    @State private var reorderItemFrame: CGRect = .zero
    @State private var toastTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            palette.bg.ignoresSafeArea()

            if !model.isReady {
                if let error = model.loadError {
                    Text(error)
                        .font(TypeRole.body())
                        .foregroundStyle(palette.text)
                        .multilineTextAlignment(.center)
                        .padding()
                } else {
                    ProgressView()
                        .tint(palette.text)
                }
            } else {
                wallet
            }
        }
        .onChange(of: scenePhase) { _, phase in
            bridge.handleScenePhase(phase)
        }
        .task(id: "\(model.openNonce)-\(model.isReady)-\(model.cards.count)") {
            guard model.isReady, let id = model.pendingOpenId else { return }
            for _ in 0..<8 {
                if bridge.selectCard(id: id) { return }
                try? await Task.sleep(nanoseconds: 100_000_000)
            }
        }
        .onChange(of: model.pendingScan) { _, scan in
            if scan != nil { showAdd = true }
        }
        .onChange(of: model.isReady) { _, ready in
            if ready, model.pendingScan != nil { showAdd = true }
        }
        .onChange(of: model.toast?.id) { _, _ in
            toastTask?.cancel()
            guard model.toast != nil else { return }
            toastTask = Task {
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                if !Task.isCancelled { model.toast = nil }
            }
        }
        .sheet(isPresented: $showAdd) {
            AddCardWizard()
                .environmentObject(model)
                .environment(\.palette, palette)
                .presentationBackground(palette.bg)
        }
        .sheet(item: $editCard) { card in
            EditCardView(card: card)
                .environmentObject(model)
                .environment(\.palette, palette)
                .presentationBackground(palette.bg)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environmentObject(model)
                .environment(\.palette, palette)
                .presentationBackground(palette.bg)
        }
    }

    private var wallet: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(spacing: 0) {
                header
                stack
            }

            if fabOpen {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .onTapGesture { fabOpen = false }
                    .zIndex(90)
            }

            fabCluster
                .zIndex(100)
                .padding(.trailing, 16)
                .padding(.bottom, 8)

            if let toast = model.toast {
                VStack {
                    Spacer()
                    ToastBanner(
                        message: toast.message,
                        actionLabel: toast.actionLabel,
                        onAction: {
                            toast.onAction?()
                            model.toast = nil
                        }
                    )
                    .padding(.bottom, 88)
                }
                .zIndex(150)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .overlay {
            if sortSheet {
                sortPanel
            }
        }
        .overlay {
            if let step = activeTutorial {
                TutorialOverlay(
                    visible: true,
                    title: step.title,
                    message: step.message,
                    targetRect: tutorialRect(for: step),
                    cutoutRadius: step.target == .fab ? 8 : 4,
                    stepIndex: step.index,
                    stepTotal: step.total,
                    onDismiss: { model.markTutorialSeen(step.id) },
                    onSkip: { model.skipTutorial() }
                )
                .zIndex(200)
            }
        }
        .animation(.easeOut(duration: 0.2), value: model.toast?.id)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Wordmark()
                Spacer()
                if model.reorderMode {
                    Button {
                        model.reorderMode = false
                    } label: {
                        Text(model.t("home.reorderDone"))
                            .font(Mono.font(.bold, size: 13))
                            .tracking(0.5)
                            .foregroundStyle(Color(hex: CardAppearance.textOnColor(CardAppearance.accent)))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 7)
                            .background(palette.accent)
                            .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            Text(model.reorderMode ? model.t("home.reordering").uppercased() : model.t("home.cardCount", count: model.cards.count).uppercased())
                .font(Mono.font(.regular, size: 12))
                .tracking(1)
                .foregroundStyle(model.reorderMode ? palette.accent : palette.textSecondary)
        }
        .foregroundStyle(palette.text)
        .padding(.horizontal, 24)
        .padding(.top, 8)
        .padding(.bottom, 14)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(palette.border)
                .frame(height: 1)
        }
    }

    private var stack: some View {
        Group {
            if model.cards.isEmpty {
                emptyState
            } else {
                Color.clear.overlay {
                    CardStackHost(
                        cards: model.cards,
                        catalog: model.catalog,
                        reorderMode: model.reorderMode,
                        bridge: bridge,
                        onReorder: { from, to in model.reorder(from: from, to: to) },
                        onEdit: { card in editCard = card }
                    )
                }
            }
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Button { showAdd = true } label: {
                VStack(spacing: 8) {
                    Text("+")
                        .font(Mono.font(.regular, size: 48))
                    Text(model.t("home.emptyState"))
                        .font(Mono.font(.regular, size: 13))
                        .tracking(0.5)
                        .multilineTextAlignment(.center)
                }
                .foregroundStyle(palette.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .overlay(
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .stroke(palette.border, style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                )
            }
            .buttonStyle(.plain)
            Spacer()
        }
        .padding(.horizontal, 4)
    }

    private var fabCluster: some View {
        VStack(alignment: .trailing, spacing: 10) {
            if fabOpen {
                fabItem(model.t("home.settings")) {
                    fabOpen = false
                    showSettings = true
                }
                fabItem(model.t("home.addCard")) {
                    fabOpen = false
                    showAdd = true
                }
                fabItem(model.t("home.reordering")) {
                    fabOpen = false
                    model.setReorderMode(true)
                }
                fabItem(model.t("home.sort"), measureReorder: true) {
                    fabOpen = false
                    sortSheet = true
                }
            }

            Button {
                withAnimation(.easeOut(duration: 0.2)) { fabOpen.toggle() }
            } label: {
                Text("☰")
                    .font(Mono.font(.regular, size: 22))
                    .foregroundStyle(Color(hex: CardAppearance.textOnColor(CardAppearance.accent)))
                    .rotationEffect(.degrees(fabOpen ? 90 : 0))
                    .frame(width: 56, height: 56)
                    .background(palette.accent)
                    .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                    .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 4)
                    .background(FrameReader { fabFrame = $0 })
            }
            .buttonStyle(.plain)
            .accessibilityLabel(model.t("home.menuAriaLabel"))
        }
    }

    private func fabItem(_ title: String, measureReorder: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(Mono.font(.medium, size: 15))
                .foregroundStyle(palette.text)
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
                .background(palette.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .stroke(palette.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                .background {
                    if measureReorder {
                        FrameReader { reorderItemFrame = $0 }
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private var sortPanel: some View {
        BottomSheet(title: model.t("sort.title"), onClose: { sortSheet = false }) {
            ForEach([SortMode.alphabetical, .dateCreated, .dateModified, .manual], id: \.self) { mode in
                Button {
                    model.applySort(mode)
                    sortSheet = false
                } label: {
                    HStack {
                        Text(sortLabel(mode))
                            .font(TypeRole.body())
                            .foregroundStyle(palette.text)
                        Spacer()
                        if model.sortMode == mode {
                            Text("✓")
                                .font(TypeRole.body())
                                .foregroundStyle(palette.accent)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func sortLabel(_ mode: SortMode) -> String {
        switch mode {
        case .alphabetical: return model.t("sort.alphabetical")
        case .dateCreated: return model.t("sort.dateAdded")
        case .dateModified: return model.t("sort.dateModified")
        case .manual: return model.t("sort.manual")
        }
    }

    private var activeTutorial: TutorialStepDef? {
        TutorialEngine.activeStep(
            ctx: TutorialContext(
                cardCount: model.cards.count,
                selectedCardIdx: bridge.selectedIndex,
                fabOpen: fabOpen,
                reorderMode: model.reorderMode
            ),
            tutorial: model.tutorial,
            t: { model.t($0) }
        )
    }

    private func tutorialRect(for step: TutorialStepDef) -> CGRect? {
        switch step.target {
        case .fab: return fabFrame == .zero ? nil : fabFrame
        case .reorderItem: return reorderItemFrame == .zero ? nil : reorderItemFrame
        case .none: return nil
        }
    }
}

private struct FrameReader: View {
    var onChange: (CGRect) -> Void

    var body: some View {
        GeometryReader { geo in
            let frame = geo.frame(in: .global)
            Color.clear
                .onAppear { onChange(frame) }
                .onChange(of: frame) { _, next in onChange(next) }
        }
    }
}
