import SwiftUI
import TesseroneKit

/// Core Image is not on watchOS. 1D family uses TesseroneKit encoders; QR uses
/// the in-kit Nayuki encoder. AZTEC / PDF417 / UPC-E / DATAMATRIX stay
/// "Open on iPhone".
struct BarcodeRenderer: View {
    let code: String
    let format: BarcodeFormat

    var body: some View {
        switch format {
        case .ean13, .ean8, .upcA, .code39, .itf14, .code128:
            renderOneD(Barcode.linearModules(code, format: format))
        case .qr:
            QRBarcodeView(code: code)
        case .aztec, .pdf417, .upcE, .dataMatrix:
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
    let format: BarcodeFormat
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
    let format: BarcodeFormat
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
