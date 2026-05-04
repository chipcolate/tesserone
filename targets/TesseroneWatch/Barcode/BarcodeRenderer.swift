import SwiftUI

/// Top-level renderer dispatcher. CoreImage / CIFilter generators are NOT
/// available on watchOS, so QR uses swift_qrcodejs (vendored via CocoaPods)
/// and the 1D family is hand-rolled. AZTEC / PDF417 / DATAMATRIX have no
/// maintained watchOS encoder; they fall through to "Open on iPhone".
struct BarcodeRenderer: View {
    let code: String
    let format: WatchBarcodeFormat

    var body: some View {
        switch format {
        case .EAN13:
            renderOneD(EAN.encodeEAN13(code))
        case .EAN8:
            renderOneD(EAN.encodeEAN8(code))
        case .UPCA:
            renderOneD(EAN.encodeUPCA(code))
        case .CODE39:
            renderOneD(Code39.encode(code))
        case .ITF14:
            renderOneD(ITF14.encode(code))
        case .CODE128:
            renderOneD(Code128.encode(code))
        case .QR:
            QRBarcodeView(code: code)
        case .AZTEC, .PDF417, .UPCE, .DATAMATRIX:
            UnsupportedFormatView(format: format)
        }
    }

    @ViewBuilder
    private func renderOneD(_ pattern: [Bool]?) -> some View {
        if let pattern {
            OneDimBarcodeView(pattern: pattern)
        } else {
            InvalidBarcodeView(code: code, format: format)
        }
    }
}

private struct UnsupportedFormatView: View {
    let format: WatchBarcodeFormat
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "iphone")
                .font(.title2)
            Text("\(format.rawValue) not supported on watch")
                .font(.caption2)
                .multilineTextAlignment(.center)
            Text("Open on iPhone")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

private struct InvalidBarcodeView: View {
    let code: String
    let format: WatchBarcodeFormat
    var body: some View {
        VStack(spacing: 4) {
            Text("Invalid \(format.rawValue) data")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(code)
                .font(.caption2.monospaced())
                .lineLimit(2)
                .truncationMode(.middle)
        }
        .padding()
    }
}
