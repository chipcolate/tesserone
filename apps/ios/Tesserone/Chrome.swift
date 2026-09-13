import SwiftUI
import TesseroneKit
import UIKit

enum ButtonVariant {
    case primary, secondary, danger, ghost
}

struct ChromeButton: View {
    let title: String
    var variant: ButtonVariant = .secondary
    var disabled: Bool = false
    var fill: Bool = false
    let action: () -> Void

    @Environment(\.palette) private var palette

    var body: some View {
        let colors = colors(palette)
        Button(action: action) {
            Text(title)
                .font(TypeRole.chromeButton())
                .tracking(0.3)
                .foregroundStyle(colors.fg)
                .frame(maxWidth: fill ? .infinity : nil)
                .padding(.vertical, 14)
                .padding(.horizontal, 16)
                .background(colors.bg)
                .overlay(
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .stroke(colors.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
        }
        .disabled(disabled)
        .opacity(disabled ? 0.4 : 1)
        .buttonStyle(.plain)
    }

    private func colors(_ palette: Palette) -> (bg: Color, fg: Color, border: Color) {
        switch variant {
        case .primary:
            return (palette.accent, Color(hex: CardAppearance.textOnColor(CardAppearance.accent)), palette.accent)
        case .secondary:
            return (palette.surface, palette.text, palette.border)
        case .danger:
            return (palette.danger, palette.dangerText, palette.danger)
        case .ghost:
            return (Color.clear, palette.text, palette.border)
        }
    }
}

struct ActionBar<Content: View>: View {
    @Environment(\.palette) private var palette
    @ViewBuilder var content: () -> Content

    var body: some View {
        HStack(spacing: 12) {
            content()
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 12)
        .background(palette.bg)
        .overlay(alignment: .top) {
            Rectangle().fill(palette.border).frame(height: 1)
        }
    }
}

struct Panel<Content: View>: View {
    @Environment(\.palette) private var palette
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(spacing: 0) {
            content()
        }
        .background(palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                .stroke(palette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
    }
}

struct BottomSheet<Content: View>: View {
    var title: String?
    var onClose: () -> Void
    @ViewBuilder var content: () -> Content
    @Environment(\.palette) private var palette

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture(perform: onClose)
            VStack(alignment: .leading, spacing: 0) {
                Capsule()
                    .fill(palette.border)
                    .frame(width: 36, height: 4)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 10)
                    .padding(.bottom, 10)
                if let title {
                    Text(title)
                        .font(TypeRole.sectionHeader())
                        .tracking(0.8)
                        .textCase(.uppercase)
                        .foregroundStyle(palette.textSecondary)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 6)
                }
                content()
            }
            .background(palette.surface)
            .overlay(
                RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                    .stroke(palette.border, lineWidth: 1)
            )
            .padding(12)
        }
    }
}

struct Wordmark: View {
    var size: CGFloat = 30
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(spacing: 9) {
            WordmarkMark(size: size, accent: palette.accent)
            HStack(spacing: 0) {
                Text("tesserone")
                    .font(Mono.font(.extraBold, size: 22))
                    .tracking(-1)
                    .foregroundStyle(palette.text)
                Text(".")
                    .font(Mono.font(.extraBold, size: 22))
                    .tracking(-1)
                    .foregroundStyle(palette.accent)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Tesserone")
    }
}

private struct WordmarkMark: View {
    var size: CGFloat
    var accent: Color

    var body: some View {
        Canvas { ctx, canvasSize in
            let s = canvasSize.width / 512
            func stroke(_ points: [CGPoint]) {
                var path = Path()
                path.move(to: CGPoint(x: points[0].x * s, y: points[0].y * s))
                for p in points.dropFirst() {
                    path.addLine(to: CGPoint(x: p.x * s, y: p.y * s))
                }
                ctx.stroke(path, with: .color(accent), style: StrokeStyle(lineWidth: 18 * s, lineCap: .square, lineJoin: .miter))
            }
            stroke([CGPoint(x: 170, y: 132), CGPoint(x: 132, y: 132), CGPoint(x: 132, y: 380), CGPoint(x: 170, y: 380)])
            stroke([CGPoint(x: 342, y: 132), CGPoint(x: 380, y: 132), CGPoint(x: 380, y: 380), CGPoint(x: 342, y: 380)])
            let tiles: [(CGFloat, Color)] = [
                (170, Color(hex: "#42A5F5")),
                (232, Color(hex: "#FFCA28")),
                (294, Color(hex: "#EF5350")),
            ]
            for (y, color) in tiles {
                let rect = CGRect(x: 184 * s, y: y * s, width: 144 * s, height: 54 * s)
                ctx.fill(Path(roundedRect: rect, cornerRadius: 5 * s), with: .color(color))
            }
        }
        .frame(width: size, height: size)
    }
}

struct FormatChipRow: View {
    @Binding var format: BarcodeFormat
    @Environment(\.palette) private var palette

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Barcode.formatOptions, id: \.value) { opt in
                    let selected = format == opt.value
                    Button {
                        format = opt.value
                    } label: {
                        Text(opt.label)
                            .font(Mono.font(selected ? .bold : .regular, size: 12))
                            .foregroundStyle(
                                selected
                                    ? Color(hex: CardAppearance.textOnColor(CardAppearance.accent))
                                    : palette.text
                            )
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(selected ? palette.accent : palette.surface)
                            .overlay(
                                RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                                    .stroke(selected ? palette.accent : palette.border, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct ColorGrid: View {
    @Binding var color: String
    @Environment(\.palette) private var palette

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 36, maximum: 36), spacing: 10)], spacing: 10) {
            ForEach(CardColors.all, id: \.self) { hex in
                let selected = color.caseInsensitiveCompare(hex) == .orderedSame
                Button {
                    color = hex
                } label: {
                    RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                        .fill(Color(hex: hex))
                        .frame(width: 36, height: 36)
                        .overlay(
                            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                                .stroke(selected ? palette.text : palette.border, lineWidth: selected ? 3 : 1)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(hex)
            }
        }
    }
}

struct FieldLabel: View {
    var text: String
    @Environment(\.palette) private var palette

    var body: some View {
        Text(text)
            .font(TypeRole.sectionHeader())
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundStyle(palette.textSecondary)
    }
}

struct MonoField: View {
    @Binding var text: String
    var placeholder: String
    var autoCapitalize: TextInputAutocapitalization = .never
    var axis: Axis = .horizontal
    @Environment(\.palette) private var palette

    var body: some View {
        TextField(placeholder, text: $text, axis: axis)
            .font(TypeRole.body())
            .foregroundStyle(palette.text)
            .textInputAutocapitalization(autoCapitalize)
            .autocorrectionDisabled()
            .padding(.horizontal, 14)
            .padding(.vertical, axis == .vertical ? 12 : 0)
            .frame(minHeight: axis == .vertical ? 80 : 48)
            .background(palette.surface)
            .overlay(
                RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                    .stroke(palette.border, lineWidth: 1)
            )
    }
}

struct ToastBanner: View {
    var message: String
    var actionLabel: String?
    var onAction: (() -> Void)?
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(spacing: 12) {
            Text(message)
                .font(TypeRole.body())
                .foregroundStyle(palette.text)
                .lineLimit(2)
            Spacer(minLength: 8)
            if let actionLabel {
                Button(actionLabel) { onAction?() }
                    .font(Mono.font(.bold, size: 14))
                    .foregroundStyle(palette.accent)
                    .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(palette.surface)
        .overlay(
            RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                .stroke(palette.border, lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }
}

struct ActivityShareSheet: UIViewControllerRepresentable {
    var items: [Any]
    var onComplete: (() -> Void)? = nil

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
        vc.completionWithItemsHandler = { _, _, _, _ in onComplete?() }
        return vc
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

enum PermissionPrompt {
    static func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

func formatCardDate(_ iso: String, language: String) -> String {
    guard let date = ISODate.date(from: iso) else { return iso }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: language)
    formatter.dateStyle = .medium
    formatter.timeStyle = .none
    return formatter.string(from: date)
}

func exportFileName(cardName: String) -> String {
    let slug = cardName
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased()
        .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
        .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    return "tesserone-\(slug.isEmpty ? "card" : slug).json"
}
