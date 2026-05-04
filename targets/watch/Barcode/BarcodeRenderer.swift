import SwiftUI

/// Top-level renderer dispatcher. Picks the right backend per format and
/// surfaces a clean fallback when we can't render a given format on watchOS.
///
/// Note: CoreImage / CIFilter generators (QR, CODE128, PDF417, AZTEC) are
/// NOT available on watchOS. Those formats fall through to "Open on iPhone"
/// until a third-party watchOS-capable encoder is added.
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
        case .QR, .AZTEC, .CODE128, .PDF417, .UPCE, .DATAMATRIX:
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
