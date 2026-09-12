import SwiftUI
import UIKit
import TesseroneKit

final class CardItemView: UIView {
    private(set) var card: FidelityCard
    private let content = UIView()
    private let flipView: CardFlipView
    private let armedBorder = UIView()
    private let reorderColumn = UIStackView()
    private let upButton = UIButton(type: .system)
    private let downButton = UIButton(type: .system)

    var onMoveUp: (() -> Void)?
    var onMoveDown: (() -> Void)?

    init(card: FidelityCard, catalog: LogoCatalog) {
        self.card = card
        let bg = catalog.backgroundHex(for: card)
        flipView = CardFlipView(
            face: CardFace(card: card, backgroundHex: bg, logo: catalog.logo(for: card)),
            back: CardBack(card: card, backgroundHex: bg)
        )
        super.init(frame: .zero)
        isAccessibilityElement = true
        accessibilityLabel = card.name
        accessibilityTraits = .button

        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 4)
        layer.shadowOpacity = 0.18
        layer.shadowRadius = 10
        layer.masksToBounds = false

        content.clipsToBounds = true
        content.layer.cornerRadius = RawGeometry.cardRadius
        content.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(content)

        flipView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        content.addSubview(flipView)

        armedBorder.isUserInteractionEnabled = false
        armedBorder.layer.borderWidth = 2
        armedBorder.layer.borderColor = UIColor(hex: CardAppearance.accent).cgColor
        armedBorder.layer.cornerRadius = RawGeometry.cardRadius
        armedBorder.alpha = 0
        armedBorder.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        content.addSubview(armedBorder)

        configureReorderControls(backgroundHex: bg)
        content.addSubview(reorderColumn)

        let handleTint: UIColor = CardAppearance.isLightColor(bg)
            ? UIColor(white: 0, alpha: 0.35)
            : UIColor(white: 1, alpha: 0.55)
        flipView.update(
            face: CardFace(card: card, backgroundHex: bg, logo: catalog.logo(for: card)),
            back: CardBack(card: card, backgroundHex: bg),
            handleTint: handleTint
        )
    }

    required init?(coder: NSCoder) { nil }

    override func layoutSubviews() {
        super.layoutSubviews()
        content.frame = bounds
        flipView.frame = content.bounds
        armedBorder.frame = content.bounds
        reorderColumn.frame = CGRect(
            x: bounds.width - 14 - 40,
            y: 14,
            width: 40,
            height: 76
        )
    }

    func update(card: FidelityCard, catalog: LogoCatalog) {
        self.card = card
        accessibilityLabel = card.name
        let bg = catalog.backgroundHex(for: card)
        let handleTint: UIColor = CardAppearance.isLightColor(bg)
            ? UIColor(white: 0, alpha: 0.35)
            : UIColor(white: 1, alpha: 0.55)
        flipView.update(
            face: CardFace(card: card, backgroundHex: bg, logo: catalog.logo(for: card)),
            back: CardBack(card: card, backgroundHex: bg),
            handleTint: handleTint
        )
        let fg = UIColor(hex: CardAppearance.textOnColor(bg))
        let chevron = UIColor(hex: bg)
        upButton.backgroundColor = fg
        downButton.backgroundColor = fg
        upButton.setTitleColor(chevron, for: .normal)
        downButton.setTitleColor(chevron, for: .normal)
    }

    func apply(layout: CardLayout, width: CGFloat, flipProgress: Double, selected: Bool, reorderMode: Bool) {
        let scale = CGFloat(layout.scale)
        UIView.performWithoutAnimation {
            transform = .identity
            frame = CGRect(x: 0, y: CGFloat(layout.y), width: width, height: max(1, CGFloat(layout.height)))
            if abs(scale - 1) > 0.001 {
                transform = CGAffineTransform(scaleX: scale, y: scale)
            }
        }
        layer.zPosition = CGFloat(layout.zIndex)
        isAccessibilityElement = !reorderMode

        flipView.progress = selected ? flipProgress : 0
        flipView.showsHandle = selected

        let armed = reorderMode ? 1 : 0
        if abs(armedBorder.alpha - CGFloat(armed)) > 0.01 {
            UIView.animate(withDuration: 0.15) { self.armedBorder.alpha = CGFloat(armed) }
        }

        reorderColumn.isHidden = !reorderMode
        reorderColumn.isUserInteractionEnabled = reorderMode
    }

    func setReorderEnds(atTop: Bool, atBottom: Bool) {
        upButton.alpha = atTop ? 0.3 : 1
        downButton.alpha = atBottom ? 0.3 : 1
        upButton.isEnabled = !atTop
        downButton.isEnabled = !atBottom
    }

    private func configureReorderControls(backgroundHex: String) {
        let fg = UIColor(hex: CardAppearance.textOnColor(backgroundHex))
        let chevron = UIColor(hex: backgroundHex)
        configureChevron(upButton, title: "▲", bg: fg, fg: chevron, up: true)
        configureChevron(downButton, title: "▼", bg: fg, fg: chevron, up: false)
        reorderColumn.axis = .vertical
        reorderColumn.spacing = 8
        reorderColumn.alignment = .fill
        reorderColumn.addArrangedSubview(upButton)
        reorderColumn.addArrangedSubview(downButton)
        reorderColumn.isHidden = true
    }

    private func configureChevron(_ button: UIButton, title: String, bg: UIColor, fg: UIColor, up: Bool) {
        button.setTitle(title, for: .normal)
        button.setTitleColor(fg, for: .normal)
        button.titleLabel?.font = Mono.uiFont(.bold, size: 16)
        button.backgroundColor = bg
        button.layer.cornerRadius = RawGeometry.cardRadius
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 40),
            button.heightAnchor.constraint(equalToConstant: 34),
        ])
        button.accessibilityLabel = up ? "Move up" : "Move down"
        button.addAction(UIAction { [weak self] _ in
            if up { self?.onMoveUp?() } else { self?.onMoveDown?() }
        }, for: .touchUpInside)
    }
}
