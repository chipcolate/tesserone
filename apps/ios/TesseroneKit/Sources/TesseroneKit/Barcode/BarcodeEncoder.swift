import Foundation

extension Barcode {
    public static func isTwoDimensional(_ format: BarcodeFormat) -> Bool {
        switch format {
        case .qr, .pdf417, .aztec, .dataMatrix: return true
        default: return false
        }
    }

    /// 1D modules (true = bar). Nil when the payload cannot be encoded.
    public static func linearModules(_ code: String, format: BarcodeFormat) -> [Bool]? {
        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        switch format {
        case .ean13: return EAN.encodeEAN13(trimmed)
        case .ean8: return EAN.encodeEAN8(trimmed)
        case .upcA: return EAN.encodeUPCA(trimmed)
        case .upcE: return EAN.encodeUPCE(trimmed)
        case .code39: return Code39.encode(trimmed)
        case .code128: return Code128.encode(trimmed)
        case .itf14: return ITF14.encode(trimmed)
        case .qr, .pdf417, .aztec, .dataMatrix: return nil
        }
    }

    /// QR module matrix (true = black). Nil when the payload cannot be encoded.
    /// Watch has no Core Image, so this is the encoder both the watch and tests use.
    public static func qrModules(_ text: String) -> [[Bool]]? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        guard let qr = try? QRCode.encode(text: trimmed, ecl: .medium) else { return nil }
        return (0..<qr.size).map { y in
            (0..<qr.size).map { x in qr.getModule(x: x, y: y) }
        }
    }
}
