import CoreImage
import SwiftUI

enum CIFilterBarcode {
    static func cgImage(for code: String, format: WatchBarcodeFormat) -> CGImage? {
        let filterName: String
        switch format {
        case .QR: filterName = "CIQRCodeGenerator"
        case .CODE128: filterName = "CICode128BarcodeGenerator"
        case .PDF417: filterName = "CIPDF417BarcodeGenerator"
        case .AZTEC: filterName = "CIAztecCodeGenerator"
        default: return nil
        }
        guard let filter = CIFilter(name: filterName) else { return nil }
        filter.setValue(Data(code.utf8), forKey: "inputMessage")
        if format == .QR {
            filter.setValue("M", forKey: "inputCorrectionLevel")
        }
        guard let output = filter.outputImage else { return nil }
        let context = CIContext(options: [.useSoftwareRenderer: false])
        return context.createCGImage(output, from: output.extent)
    }
}

struct CIFilterBarcodeView: View {
    let code: String
    let format: WatchBarcodeFormat
    let isQRLike: Bool

    var body: some View {
        if let img = CIFilterBarcode.cgImage(for: code, format: format) {
            Image(decorative: img, scale: 1, orientation: .up)
                .interpolation(.none)
                .resizable()
                .aspectRatio(isQRLike ? 1 : nil, contentMode: .fit)
        } else {
            Text("Cannot render")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
