import Foundation
#if canImport(Vision) && !os(watchOS)
import CoreGraphics
import ImageIO
import Vision

/// Still-image barcode detection. Port of `modules/barcode-vision/ios/BarcodeVisionModule.swift`.
public enum ImageBarcodeDetector {
    public struct Detection: Equatable, Sendable {
        public var data: String
        /// Scanner-style type string (`ean13`, `qr`, `upc_e`, …) matching `Barcode.mapScannerType`.
        public var type: String

        public init(data: String, type: String) {
            self.data = data
            self.type = type
        }

        public var format: BarcodeFormat { Barcode.mapScannerType(type) }

        public var fixed: (code: String, format: BarcodeFormat) {
            Barcode.fixScannedCode(
                data.trimmingCharacters(in: .whitespacesAndNewlines),
                format: format
            )
        }
    }

    public static func detect(in data: Data) -> [Detection] {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
        else { return [] }
        return detect(in: image)
    }

    public static func detect(in url: URL) -> [Detection] {
        let resolved: URL = {
            if url.isFileURL { return url }
            if url.scheme == "http" || url.scheme == "https" { return url }
            return URL(fileURLWithPath: url.path)
        }()
        guard let data = try? Data(contentsOf: resolved) else { return [] }
        return detect(in: data)
    }

    public static func detect(in image: CGImage) -> [Detection] {
        let request = VNDetectBarcodesRequest()
        request.symbologies = [
            .qr, .ean13, .ean8, .code128, .code39, .pdf417,
            .aztec, .dataMatrix, .itf14, .upce,
        ]
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
        } catch {
            return []
        }
        let observations = request.results ?? []
        return observations.compactMap { obs in
            guard let payload = obs.payloadStringValue, !payload.isEmpty else { return nil }
            return Detection(data: payload, type: symbologyName(obs.symbology))
        }
    }

    public static func mapSymbology(_ symbology: VNBarcodeSymbology) -> BarcodeFormat {
        Barcode.mapScannerType(symbologyName(symbology))
    }

    public static func symbologyName(_ s: VNBarcodeSymbology) -> String {
        switch s {
        case .qr: return "qr"
        case .ean13: return "ean13"
        case .ean8: return "ean8"
        case .code128: return "code128"
        case .code39: return "code39"
        case .pdf417: return "pdf417"
        case .aztec: return "aztec"
        case .dataMatrix: return "datamatrix"
        case .itf14: return "itf14"
        case .upce: return "upc_e"
        default: return "unknown"
        }
    }
}
#endif
