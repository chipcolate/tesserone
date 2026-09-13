import SwiftUI
import UIKit
import TesseroneKit

enum CardFlip {
    static let perspective: CGFloat = CGFloat(CardStackMotion.flipPerspective)

    static func perspectiveRotateY(_ radians: Double) -> CATransform3D {
        var transform = CATransform3DIdentity
        transform.m34 = -1 / perspective
        return CATransform3DRotate(transform, CGFloat(radians), 0, 1, 0)
    }
}

/// Front/back pair with a rotateY hinge. Progress 0 = front, π = back.
final class CardFlipView: UIView {
    private let frontHost: HostingView<CardFace>
    private let backHost: HostingView<CardBack>
    private let frontHandle = UIView()
    private let backHandle = UIView()

    var progress: Double = 0 {
        didSet { applyFlip() }
    }

    var showsHandle: Bool = false {
        didSet { applyFlip() }
    }

    init(face: CardFace, back: CardBack) {
        frontHost = HostingView(rootView: face)
        backHost = HostingView(rootView: back)
        super.init(frame: .zero)
        clipsToBounds = true

        for host in [frontHost as UIView, backHost as UIView] {
            host.translatesAutoresizingMaskIntoConstraints = true
            host.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            host.layer.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            host.layer.isDoubleSided = false
            host.layer.allowsEdgeAntialiasing = true
            addSubview(host)
        }

        configureHandle(frontHandle)
        configureHandle(backHandle)
        addSubview(frontHandle)
        addSubview(backHandle)
        applyFlip()
    }

    required init?(coder: NSCoder) { nil }

    func update(face: CardFace, back: CardBack, handleTint: UIColor) {
        frontHost.rootView = face
        backHost.rootView = back
        frontHandle.backgroundColor = handleTint
        backHandle.backgroundColor = UIColor(white: 0, alpha: 0.35)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        frontHost.layer.transform = CATransform3DIdentity
        backHost.layer.transform = CATransform3DIdentity
        frontHandle.layer.transform = CATransform3DIdentity
        backHandle.layer.transform = CATransform3DIdentity
        frontHost.frame = bounds
        backHost.frame = bounds
        let handleSize = CGSize(width: 36, height: 5)
        let handleFrame = CGRect(
            x: (bounds.width - handleSize.width) / 2,
            y: bounds.height - 8 - handleSize.height,
            width: handleSize.width,
            height: handleSize.height
        )
        frontHandle.frame = handleFrame
        backHandle.frame = handleFrame
        applyFlip()
        CATransaction.commit()
    }

    private func configureHandle(_ view: UIView) {
        view.layer.cornerRadius = 2.5
        view.isUserInteractionEnabled = false
        view.layer.anchorPoint = CGPoint(x: 0.5, y: 0.5)
        view.layer.isDoubleSided = false
    }

    private func applyFlip() {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let frontT = CardFlip.perspectiveRotateY(progress)
        let backT = CardFlip.perspectiveRotateY(progress + .pi)
        frontHost.layer.transform = frontT
        backHost.layer.transform = backT
        frontHandle.layer.transform = frontT
        backHandle.layer.transform = backT
        let frontOpacity = Float(CardStackMotion.frontFaceOpacity(progress))
        let backOpacity = Float(CardStackMotion.backFaceOpacity(progress))
        frontHost.layer.opacity = frontOpacity
        backHost.layer.opacity = backOpacity
        frontHandle.layer.opacity = showsHandle ? frontOpacity : 0
        backHandle.layer.opacity = showsHandle ? backOpacity : 0
        CATransaction.commit()
    }
}

final class HostingView<Content: View>: UIView {
    private let host: UIHostingController<Content>

    var rootView: Content {
        get { host.rootView }
        set { host.rootView = newValue }
    }

    init(rootView: Content) {
        host = UIHostingController(rootView: rootView)
        super.init(frame: .zero)
        host.view.backgroundColor = .clear
        host.safeAreaRegions = []
        host.sizingOptions = []
        host.view.insetsLayoutMarginsFromSafeArea = false
        host.view.translatesAutoresizingMaskIntoConstraints = true
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(host.view)
    }

    required init?(coder: NSCoder) { nil }

    override func layoutSubviews() {
        super.layoutSubviews()
        host.view.frame = bounds
    }
}
