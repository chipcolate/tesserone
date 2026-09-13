import Combine
import SwiftUI
import UIKit
import TesseroneKit

final class CardStackBridge: ObservableObject {
    weak var view: CardStackView?
    @Published var selectedIndex: Int = -1

    func selectCard(id: String) -> Bool {
        view?.selectCard(id: id) ?? false
    }

    var viewportReady: Bool {
        (view?.bounds.height ?? 0) > 0
    }

    var hasSelection: Bool {
        (view?.selectedIndex ?? -1) != -1
    }

    func handleScenePhase(_ phase: ScenePhase) {
        view?.handleScenePhase(phase)
    }
}

final class CardStackView: UIView, UIGestureRecognizerDelegate {
    private(set) var cards: [FidelityCard] = []
    private var catalog: LogoCatalog?
    private var items: [String: CardItemView] = [:]
    private var anim: [String: CardAnim] = [:]

    private(set) var selectedIndex = -1
    private var scrollOffset = 0.0
    private var scrollVelocity = 0.0
    private var maxScrollValue = 0.0
    private var viewportHeight = 0.0
    private var dismissTranslateY = 0.0
    private var dismissVelocity = 0.0
    private var flipProgress = 0.0
    private var reorderMode = false
    private var draggedIndex = -1
    private var dragTranslateY = 0.0
    private var dragStartY = 0.0
    private var reorderTouchOrigin = CGPoint.zero

    private var savedOffset = 0.0
    private var savedDismissY = 0.0
    private var panArmed = false

    private var scrollSpringTarget: Double?
    private var dismissSpringTarget: Double?
    private var decaying = false
    private var flipTiming: (from: Double, to: Double, start: CFTimeInterval, duration: Double)?
    private var positionSpring: MotionSpring = CardStackMotion.stiff
    private var followScrollDirectly = true
    private var hasLaidOut = false

    private let pan = UIPanGestureRecognizer()
    private var displayLink: CADisplayLink?
    private let tickProxy = TickProxy()
    private let mediumHaptic = UIImpactFeedbackGenerator(style: .medium)
    private let lightHaptic = UIImpactFeedbackGenerator(style: .light)
    private let brightness = BrightnessController()

    var onReorder: ((Int, Int) -> Void)?
    var onEdit: ((FidelityCard) -> Void)?
    var onSelectionChange: ((Int) -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = true
        backgroundColor = .clear
        pan.addTarget(self, action: #selector(handlePan(_:)))
        pan.delegate = self
        addGestureRecognizer(pan)
        tickProxy.owner = self
        mediumHaptic.prepare()
        lightHaptic.prepare()
    }

    required init?(coder: NSCoder) { nil }

    deinit {
        displayLink?.invalidate()
    }

    func configure(
        cards: [FidelityCard],
        catalog: LogoCatalog,
        reorderMode: Bool,
        onReorder: @escaping (Int, Int) -> Void,
        onEdit: @escaping (FidelityCard) -> Void
    ) {
        self.catalog = catalog
        self.onReorder = onReorder
        self.onEdit = onEdit
        let reorderChanged = self.reorderMode != reorderMode
        self.reorderMode = reorderMode
        if reorderChanged, reorderMode, selectedIndex != -1 {
            dismissSelected(haptic: false)
        }
        rebuildCards(cards)
        notifySelection()
        updateMaxScroll()
        layoutCards(dt: nil)
        updateGestureAvailability()
    }

    @discardableResult
    func selectCard(id: String) -> Bool {
        guard let index = cards.firstIndex(where: { $0.id == id }) else { return false }
        return selectCardByIndex(index)
    }

    @discardableResult
    func selectCardByIndex(_ index: Int) -> Bool {
        if index < 0 { return true }
        if reorderMode { return true }
        let already = selectedIndex == index
        selectedIndex = index
        notifySelection()
        followScrollDirectly = false
        positionSpring = CardStackMotion.select
        animateFlip(to: .pi)
        if !already {
            mediumHaptic.impactOccurred()
            mediumHaptic.prepare()
            brightness.maximize()
        }
        startDisplayLink()
        updateGestureAvailability()
        return viewportHeight > 0
    }

    func handleScenePhase(_ phase: ScenePhase) {
        switch phase {
        case .background, .inactive:
            brightness.restore()
        case .active:
            if selectedIndex != -1 {
                brightness.maximize()
            }
        @unknown default:
            break
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let vh = Double(bounds.height)
        if abs(vh - viewportHeight) > 0.5 {
            viewportHeight = vh
            updateMaxScroll()
            if scrollOffset > maxScrollValue {
                scrollOffset = maxScrollValue
            }
            if followScrollDirectly || !hasLaidOut {
                layoutCards(dt: nil)
            } else {
                startDisplayLink()
            }
        }
    }

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let ordered = items.values.sorted { $0.layer.zPosition > $1.layer.zPosition }
        for item in ordered {
            let local = convert(point, to: item)
            if let hit = item.hitTest(local, with: event) {
                return hit
            }
        }
        return super.hitTest(point, with: event)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        if gestureRecognizer == pan, touch.view is UIButton {
            return false
        }
        return true
    }

    override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        if gestureRecognizer == pan {
            if draggedIndex != -1 { return false }
            let t = pan.translation(in: self)
            return abs(t.y) >= abs(t.x)
        }
        return true
    }

    // MARK: - Cards

    private func rebuildCards(_ newCards: [FidelityCard]) {
        let catalog = catalog ?? LogoCatalog(brands: nil, customLogos: CustomLogoStore(directory: URL(fileURLWithPath: "/tmp")))
        let newIds = Set(newCards.map(\.id))
        for (id, view) in items where !newIds.contains(id) {
            view.removeFromSuperview()
            items.removeValue(forKey: id)
            anim.removeValue(forKey: id)
        }
        for (index, card) in newCards.enumerated() {
            if let existing = items[card.id] {
                existing.update(card: card, catalog: catalog)
                existing.setReorderEnds(atTop: index == 0, atBottom: index == newCards.count - 1)
            } else {
                let item = CardItemView(card: card, catalog: catalog)
                attachGestures(to: item)
                item.onMoveUp = { [weak self] in self?.nudge(id: card.id, delta: -1) }
                item.onMoveDown = { [weak self] in self?.nudge(id: card.id, delta: 1) }
                addSubview(item)
                items[card.id] = item
                item.setReorderEnds(atTop: index == 0, atBottom: index == newCards.count - 1)
            }
        }
        cards = newCards
        if selectedIndex >= cards.count {
            selectedIndex = -1
            notifySelection()
            flipProgress = 0
            brightness.restore()
        }
    }

    private func attachGestures(to item: CardItemView) {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        tap.delegate = self
        item.addGestureRecognizer(tap)

        let edit = UILongPressGestureRecognizer(target: self, action: #selector(handleEdit(_:)))
        edit.minimumPressDuration = CardStackMotion.editLongPress
        edit.delegate = self
        item.addGestureRecognizer(edit)
        tap.require(toFail: edit)

        let reorder = UILongPressGestureRecognizer(target: self, action: #selector(handleReorder(_:)))
        reorder.minimumPressDuration = CardStackMotion.reorderLongPress
        reorder.allowableMovement = 12
        reorder.delegate = self
        item.addGestureRecognizer(reorder)
    }

    private func updateGestureAvailability() {
        for item in items.values {
            for g in item.gestureRecognizers ?? [] {
                if let long = g as? UILongPressGestureRecognizer {
                    if abs(long.minimumPressDuration - CardStackMotion.editLongPress) < 0.01 {
                        long.isEnabled = !reorderMode && selectedIndex != -1
                    } else {
                        long.isEnabled = reorderMode
                    }
                } else if g is UITapGestureRecognizer {
                    g.isEnabled = !reorderMode
                }
            }
        }
    }

    // MARK: - Gestures

    @objc private func handleTap(_ g: UITapGestureRecognizer) {
        guard !reorderMode, g.state == .ended, let item = g.view as? CardItemView else { return }
        guard let index = cards.firstIndex(where: { $0.id == item.card.id }) else { return }
        if selectedIndex == -1 {
            _ = selectCardByIndex(index)
        } else if selectedIndex == index {
            dismissSelected(haptic: true)
        }
    }

    @objc private func handleEdit(_ g: UILongPressGestureRecognizer) {
        guard !reorderMode, g.state == .began, let item = g.view as? CardItemView else { return }
        guard let index = cards.firstIndex(where: { $0.id == item.card.id }) else { return }
        guard selectedIndex == index else { return }
        mediumHaptic.impactOccurred()
        mediumHaptic.prepare()
        let card = item.card
        dismissSelected(haptic: false)
        onEdit?(card)
    }

    @objc private func handleReorder(_ g: UILongPressGestureRecognizer) {
        guard reorderMode, let item = g.view as? CardItemView else { return }
        guard let index = cards.firstIndex(where: { $0.id == item.card.id }) else { return }
        switch g.state {
        case .began:
            pan.isEnabled = false
            pan.isEnabled = true
            draggedIndex = index
            dragTranslateY = 0
            dragStartY = Double(index) * CardStackMotion.stackSpacing - scrollOffset
            reorderTouchOrigin = g.location(in: self)
            followScrollDirectly = false
            positionSpring = CardStackMotion.reorder
            mediumHaptic.impactOccurred()
            mediumHaptic.prepare()
            layoutCards(dt: nil)
        case .changed:
            guard draggedIndex == index else { return }
            dragTranslateY = Double(g.location(in: self).y - reorderTouchOrigin.y)
            layoutCards(dt: nil)
        case .ended, .cancelled, .failed:
            guard draggedIndex == index else { return }
            let currentY = dragStartY + dragTranslateY
            let raw = Int(((max(0, currentY + scrollOffset)) / CardStackMotion.stackSpacing).rounded())
            let from = draggedIndex
            draggedIndex = -1
            dragTranslateY = 0
            positionSpring = CardStackMotion.stiff
            followScrollDirectly = false
            startDisplayLink()
            if raw != from {
                onReorder?(from, raw)
                lightHaptic.impactOccurred()
                lightHaptic.prepare()
            }
            layoutCards(dt: nil)
        default:
            break
        }
    }

    @objc private func handlePan(_ g: UIPanGestureRecognizer) {
        let translation = g.translation(in: self)
        let velocity = g.velocity(in: self)
        switch g.state {
        case .began:
            decaying = false
            scrollSpringTarget = nil
            savedOffset = scrollOffset
            savedDismissY = dismissTranslateY
            panArmed = false
            scrollVelocity = 0
        case .changed:
            if !panArmed {
                if abs(translation.y) < CardStackMotion.panActivation { return }
                panArmed = true
            }
            if selectedIndex == -1 {
                followScrollDirectly = true
                let raw = savedOffset - Double(translation.y)
                let maxS = maxScrollValue
                if raw < 0 {
                    scrollOffset = CardStackMotion.rubberBand(raw, limit: 0)
                } else if raw > maxS {
                    scrollOffset = CardStackMotion.rubberBand(raw, limit: maxS)
                } else {
                    scrollOffset = raw
                }
                layoutCards(dt: nil)
            } else {
                dismissTranslateY = min(0, savedDismissY + Double(translation.y))
                dismissSpringTarget = nil
                startDisplayLink()
            }
        case .ended, .cancelled:
            panArmed = false
            if selectedIndex == -1 {
                let maxS = maxScrollValue
                if scrollOffset < 0 {
                    scrollSpringTarget = 0
                    followScrollDirectly = true
                    lightHaptic.impactOccurred()
                    lightHaptic.prepare()
                    startDisplayLink()
                } else if scrollOffset > maxS {
                    scrollSpringTarget = maxS
                    followScrollDirectly = true
                    lightHaptic.impactOccurred()
                    lightHaptic.prepare()
                    startDisplayLink()
                } else {
                    decaying = true
                    scrollVelocity = Double(-velocity.y)
                    followScrollDirectly = true
                    startDisplayLink()
                }
            } else if dismissTranslateY < -CardStackMotion.dismissDistance || velocity.y < -CardStackMotion.dismissVelocity {
                dismissSelected(haptic: false)
            } else {
                dismissSpringTarget = 0
                startDisplayLink()
            }
        default:
            break
        }
    }

    private func nudge(id: String, delta: Int) {
        guard let from = cards.firstIndex(where: { $0.id == id }) else { return }
        let to = from + delta
        guard cards.indices.contains(to) else { return }
        onReorder?(from, to)
        lightHaptic.impactOccurred()
        lightHaptic.prepare()
    }

    private func notifySelection() {
        onSelectionChange?(selectedIndex)
    }

    private func dismissSelected(haptic: Bool) {
        selectedIndex = -1
        notifySelection()
        dismissTranslateY = 0
        dismissVelocity = 0
        dismissSpringTarget = nil
        followScrollDirectly = false
        positionSpring = CardStackMotion.stiff
        animateFlip(to: 0)
        brightness.restore()
        if haptic {
            mediumHaptic.impactOccurred()
            mediumHaptic.prepare()
        }
        startDisplayLink()
        updateGestureAvailability()
    }

    private func animateFlip(to target: Double) {
        flipTiming = (from: flipProgress, to: target, start: CACurrentMediaTime(), duration: CardStackMotion.flipDuration)
        startDisplayLink()
    }

    // MARK: - Animation

    private func startDisplayLink() {
        guard displayLink == nil else { return }
        let link = CADisplayLink(target: tickProxy, selector: #selector(TickProxy.tick(_:)))
        link.add(to: .main, forMode: .common)
        displayLink = link
    }

    private func stopDisplayLink() {
        displayLink?.invalidate()
        displayLink = nil
    }

    fileprivate func tick(_ link: CADisplayLink) {
        let dt = min(link.duration, 1.0 / 30.0)
        let now = CACurrentMediaTime()
        var busy = false

        if let timing = flipTiming {
            let p = (now - timing.start) / timing.duration
            if p >= 1 {
                flipProgress = timing.to
                flipTiming = nil
            } else {
                flipProgress = timing.from + (timing.to - timing.from) * CardStackMotion.easeOutCubic(p)
                busy = true
            }
        }

        if let target = scrollSpringTarget {
            let stepped = SpringIntegrator.step(
                value: scrollOffset,
                target: target,
                velocity: scrollVelocity,
                dt: dt,
                spring: CardStackMotion.bounce
            )
            scrollOffset = stepped.value
            scrollVelocity = stepped.velocity
            if stepped.settled {
                scrollSpringTarget = nil
                scrollOffset = target
                scrollVelocity = 0
            } else {
                busy = true
            }
        } else if decaying {
            let stepped = DecayIntegrator.step(
                value: scrollOffset,
                velocity: scrollVelocity,
                dt: dt,
                clampMin: 0,
                clampMax: maxScrollValue
            )
            scrollOffset = stepped.value
            scrollVelocity = stepped.velocity
            if stepped.settled {
                decaying = false
                scrollVelocity = 0
            } else {
                busy = true
            }
        }

        if let target = dismissSpringTarget {
            let stepped = SpringIntegrator.step(
                value: dismissTranslateY,
                target: target,
                velocity: dismissVelocity,
                dt: dt,
                spring: CardStackMotion.select
            )
            dismissTranslateY = stepped.value
            dismissVelocity = stepped.velocity
            if stepped.settled {
                dismissSpringTarget = nil
                dismissTranslateY = target
                dismissVelocity = 0
            } else {
                busy = true
            }
        }

        if layoutCards(dt: dt) { busy = true }

        if !busy && draggedIndex == -1 {
            stopDisplayLink()
        }
    }

    @discardableResult
    private func layoutCards(dt: Double?) -> Bool {
        guard bounds.width > 0 else { return false }
        let width = bounds.width
        let state = CardStackLayoutState(
            viewportHeight: viewportHeight,
            scrollOffset: scrollOffset,
            selectedIndex: selectedIndex,
            dismissTranslateY: dismissTranslateY,
            reorderMode: reorderMode,
            draggedIndex: draggedIndex,
            dragStartY: dragStartY,
            dragTranslateY: dragTranslateY,
            total: cards.count
        )
        var stillSpringing = false
        for (index, card) in cards.enumerated() {
            guard let item = items[card.id] else { continue }
            let target = CardStackMotion.layout(index: index, state: state)
            let isDragged = draggedIndex == index
            let direct = isDragged || (followScrollDirectly && selectedIndex == -1 && draggedIndex == -1)
            var current = anim[card.id] ?? CardAnim(y: target.y, height: target.height, scale: target.scale)
            if !hasLaidOut || direct {
                current.y = target.y
                current.height = target.height
                current.scale = target.scale
                current.yVel = 0
                current.heightVel = 0
                current.scaleVel = 0
            } else if let dt {
                let spring = selectedIndex == -1 ? positionSpring : CardStackMotion.select
                let y = SpringIntegrator.step(value: current.y, target: target.y, velocity: current.yVel, dt: dt, spring: spring)
                let h = SpringIntegrator.step(value: current.height, target: target.height, velocity: current.heightVel, dt: dt, spring: spring)
                let s = SpringIntegrator.step(value: current.scale, target: target.scale, velocity: current.scaleVel, dt: dt, spring: spring)
                current.y = y.value
                current.yVel = y.velocity
                current.height = h.value
                current.heightVel = h.velocity
                current.scale = s.value
                current.scaleVel = s.velocity
                if !y.settled || !h.settled || !s.settled { stillSpringing = true }
            }
            anim[card.id] = current
            let presented = CardLayout(y: current.y, height: current.height, scale: current.scale, zIndex: target.zIndex)
            item.apply(
                layout: presented,
                width: width,
                flipProgress: flipProgress,
                selected: selectedIndex == index,
                reorderMode: reorderMode
            )
            item.setReorderEnds(atTop: index == 0, atBottom: index == cards.count - 1)
        }
        hasLaidOut = true
        return stillSpringing
    }

    private func updateMaxScroll() {
        maxScrollValue = CardStackMotion.maxScroll(cardCount: cards.count, viewportHeight: viewportHeight)
        if panArmed || decaying || scrollSpringTarget != nil { return }
        if scrollOffset > maxScrollValue { scrollOffset = maxScrollValue }
        if scrollOffset < 0 { scrollOffset = 0 }
    }
}

private struct CardAnim {
    var y: Double
    var height: Double
    var scale: Double
    var yVel: Double = 0
    var heightVel: Double = 0
    var scaleVel: Double = 0
}

private final class TickProxy: NSObject {
    weak var owner: CardStackView?
    @objc func tick(_ link: CADisplayLink) {
        owner?.tick(link)
    }
}

struct CardStackHost: UIViewRepresentable {
    var cards: [FidelityCard]
    var catalog: LogoCatalog
    var reorderMode: Bool
    var bridge: CardStackBridge
    var onReorder: (Int, Int) -> Void
    var onEdit: (FidelityCard) -> Void

    func makeUIView(context: Context) -> CardStackView {
        let view = CardStackView()
        bind(view)
        view.configure(cards: cards, catalog: catalog, reorderMode: reorderMode, onReorder: onReorder, onEdit: onEdit)
        return view
    }

    func updateUIView(_ uiView: CardStackView, context: Context) {
        bind(uiView)
        uiView.configure(cards: cards, catalog: catalog, reorderMode: reorderMode, onReorder: onReorder, onEdit: onEdit)
    }

    private func bind(_ view: CardStackView) {
        bridge.view = view
        view.onSelectionChange = { [weak bridge] idx in
            DispatchQueue.main.async {
                if bridge?.selectedIndex != idx {
                    bridge?.selectedIndex = idx
                }
            }
        }
        if bridge.selectedIndex != view.selectedIndex {
            bridge.selectedIndex = view.selectedIndex
        }
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: CardStackView, context: Context) -> CGSize {
        let w = proposal.width ?? uiView.bounds.width
        let h = proposal.height ?? uiView.bounds.height
        return CGSize(width: w, height: h)
    }
}
