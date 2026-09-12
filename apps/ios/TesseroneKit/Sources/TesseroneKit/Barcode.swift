import Foundation

/// Port of `src/services/scanner.ts`.
public enum Barcode {
    public static let formatOptions: [BarcodeFormatOption] = [
        .init(value: .ean13, label: "EAN-13"),
        .init(value: .ean8, label: "EAN-8"),
        .init(value: .code128, label: "Code 128"),
        .init(value: .code39, label: "Code 39"),
        .init(value: .qr, label: "QR"),
        .init(value: .upcA, label: "UPC-A"),
        .init(value: .upcE, label: "UPC-E"),
    ]

    public static func mapScannerType(_ type: String) -> BarcodeFormat {
        BarcodeFormat.normalize(type)
    }

    public static func validate(_ code: String, format: BarcodeFormat) -> Bool {
        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return false }
        switch format {
        case .ean13:
            return trimmed.range(of: #"^\d{13}$"#, options: .regularExpression) != nil
        case .ean8:
            return trimmed.range(of: #"^\d{8}$"#, options: .regularExpression) != nil
        case .upcA:
            return trimmed.range(of: #"^\d{12}$"#, options: .regularExpression) != nil
        case .upcE:
            return trimmed.range(of: #"^\d{6,8}$"#, options: .regularExpression) != nil
        case .code128, .code39:
            return trimmed.count > 0
        default:
            return true
        }
    }

    /// EAN-13 sometimes scans as 12 digits (missing leading zero).
    public static func fixScannedCode(_ code: String, format: BarcodeFormat) -> (code: String, format: BarcodeFormat) {
        if format == .ean13, code.range(of: #"^\d{12}$"#, options: .regularExpression) != nil {
            return ("0" + code, .ean13)
        }
        return (code, format)
    }
}
