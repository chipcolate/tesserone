import SwiftUI

struct TutorialOverlay: View {
    var visible: Bool
    var title: String
    var message: String
    var targetRect: CGRect?
    var cutoutRadius: CGFloat
    var stepIndex: Int
    var stepTotal: Int
    var onDismiss: () -> Void
    var onSkip: () -> Void

    @EnvironmentObject private var model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        GeometryReader { geo in
            let cutout = inflatedCutout(in: geo.size)
            ZStack(alignment: .topLeading) {
                backdrop(size: geo.size, cutout: cutout)
                    .onTapGesture(perform: onDismiss)

                callout(in: geo.size, cutout: cutout)
            }
        }
        .ignoresSafeArea()
        .opacity(visible ? 1 : 0)
        .allowsHitTesting(visible)
        .animation(.easeOut(duration: 0.22), value: visible)
        .animation(.easeOut(duration: 0.22), value: stepIndex)
    }

    private func inflatedCutout(in size: CGSize) -> CGRect? {
        guard let targetRect else { return nil }
        let padding: CGFloat = 8
        return CGRect(
            x: max(0, targetRect.minX - padding),
            y: max(0, targetRect.minY - padding),
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2
        )
        .intersection(CGRect(origin: .zero, size: size))
    }

    private func backdrop(size: CGSize, cutout: CGRect?) -> some View {
        Canvas { ctx, canvasSize in
            var path = Path(CGRect(origin: .zero, size: canvasSize))
            if let cutout {
                path.addRoundedRect(in: cutout, cornerSize: CGSize(width: cutoutRadius, height: cutoutRadius))
            }
            ctx.fill(path, with: .color(Color.black.opacity(0.6)), style: FillStyle(eoFill: true))
        }
        .frame(width: size.width, height: size.height)
        .contentShape(Rectangle())
    }

    private func callout(in size: CGSize, cutout: CGRect?) -> some View {
        let placeBelow: Bool = {
            guard let cutout else { return true }
            let below = size.height - cutout.maxY
            let above = cutout.minY
            return below >= above
        }()

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(model.t("tutorial.stepIndicator", [
                    "current": String(stepIndex + 1),
                    "total": String(stepTotal),
                ]))
                .font(Mono.font(.bold, size: 12))
                .tracking(1)
                .textCase(.uppercase)
                .foregroundStyle(palette.textSecondary)
                Spacer()
                Button(action: onSkip) {
                    Text(model.t("tutorial.skip"))
                        .font(Mono.font(.bold, size: 12))
                        .tracking(1)
                        .textCase(.uppercase)
                        .foregroundStyle(palette.textSecondary)
                }
                .buttonStyle(.plain)
            }
            if !title.isEmpty {
                Text(title)
                    .font(Mono.font(.bold, size: 16))
                    .foregroundStyle(palette.text)
            }
            Text(message)
                .font(TypeRole.body())
                .foregroundStyle(palette.text)
            HStack {
                Spacer()
                ChromeButton(title: model.t("common.gotIt"), variant: .primary, action: onDismiss)
            }
        }
        .padding(18)
        .background(palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                .stroke(palette.border, lineWidth: 1)
        )
        .padding(.horizontal, 24)
        .offset(y: calloutOffset(size: size, cutout: cutout, placeBelow: placeBelow))
    }

    private func calloutOffset(size: CGSize, cutout: CGRect?, placeBelow: Bool) -> CGFloat {
        if let cutout {
            if placeBelow { return cutout.maxY + 18 }
            return max(24, cutout.minY - 180)
        }
        return size.height * 0.42
    }
}
