import CoreImage
import UIKit
import TesseroneKit

enum CoreImageBarcode {
    private static let context = CIContext(options: [.useSoftwareRenderer: false])

    static func image(code: String, format: BarcodeFormat) -> UIImage? {
        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let data = trimmed.data(using: .isoLatin1) ?? trimmed.data(using: .utf8)
        guard let data else { return nil }

        let filterName: String
        var extras: [String: Any] = [:]
        switch format {
        case .qr:
            filterName = "CIQRCodeGenerator"
            extras["inputCorrectionLevel"] = "M"
        case .pdf417:
            filterName = "CIPDF417BarcodeGenerator"
        case .aztec:
            filterName = "CIAztecCodeGenerator"
        case .dataMatrix:
            filterName = CIFilter(name: "CIDataMatrixBarcodeGenerator") != nil
                ? "CIDataMatrixBarcodeGenerator"
                : "CIDataMatrixCodeGenerator"
        case .code128:
            filterName = "CICode128BarcodeGenerator"
        default:
            return nil
        }

        guard let filter = CIFilter(name: filterName) else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        for (key, value) in extras {
            filter.setValue(value, forKey: key)
        }
        guard var output = filter.outputImage else { return nil }

        let extent = output.extent.integral
        guard extent.width > 0, extent.height > 0 else { return nil }
        let scale = max(CGFloat(8), min(CGFloat(16), CGFloat(240) / max(extent.width, 1)))
        output = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let cg = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
