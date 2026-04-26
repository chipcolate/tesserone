import ExpoModulesCore
import Vision
import UIKit

public class BarcodeVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BarcodeVision")

    AsyncFunction("detectBarcodesInImage") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let url: URL? = {
          if uri.hasPrefix("file://") || uri.hasPrefix("http://") || uri.hasPrefix("https://") {
            return URL(string: uri)
          }
          return URL(fileURLWithPath: uri)
        }()

        guard let resolvedUrl = url,
              let data = try? Data(contentsOf: resolvedUrl),
              let image = UIImage(data: data),
              let cgImage = image.cgImage else {
          promise.resolve([])
          return
        }

        let request = VNDetectBarcodesRequest()
        request.symbologies = [
          .qr, .ean13, .ean8, .code128, .code39, .pdf417,
          .aztec, .dataMatrix, .itf14, .upce
        ]

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
          try handler.perform([request])
          let observations = (request.results as? [VNBarcodeObservation]) ?? []
          let mapped: [[String: String]] = observations.compactMap { obs in
            guard let payload = obs.payloadStringValue else { return nil }
            return ["data": payload, "type": symbologyName(obs.symbology)]
          }
          promise.resolve(mapped)
        } catch {
          promise.resolve([])
        }
      }
    }
  }
}

private func symbologyName(_ s: VNBarcodeSymbology) -> String {
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
