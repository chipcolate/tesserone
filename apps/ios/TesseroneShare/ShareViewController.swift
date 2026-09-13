import TesseroneKit
import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        loadSharedImage()
    }

    private func loadSharedImage() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let provider = item.attachments?.first(where: {
                  $0.hasItemConformingToTypeIdentifier(UTType.image.identifier)
              })
        else {
            finish(openApp: true)
            return
        }
        provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] item, _ in
            let image = Self.image(from: item)
            DispatchQueue.global(qos: .userInitiated).async {
                self?.detectAndStore(image: image)
            }
        }
    }

    private static func image(from item: NSSecureCoding?) -> UIImage? {
        if let image = item as? UIImage { return image }
        if let url = item as? URL, let data = try? Data(contentsOf: url) { return UIImage(data: data) }
        if let data = item as? Data { return UIImage(data: data) }
        return nil
    }

    private func detectAndStore(image: UIImage?) {
        if let image {
            let detections: [ImageBarcodeDetector.Detection]
            if let data = image.jpegData(compressionQuality: 0.95) {
                detections = ImageBarcodeDetector.detect(in: data)
            } else if let cg = image.cgImage {
                detections = ImageBarcodeDetector.detect(in: cg)
            } else {
                detections = []
            }
            if let first = detections.first {
                let fixed = first.fixed
                try? PendingScanStore.write(PendingScanPayload(code: fixed.code, format: fixed.format))
            }
        }
        DispatchQueue.main.async { [weak self] in
            self?.finish(openApp: true)
        }
    }

    private func finish(openApp: Bool) {
        if openApp {
            openHostApp()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    /// Share extensions cannot always call `extensionContext.open`. Walk the
    /// responder chain so the host app opens `tesserone://add`.
    private func openHostApp() {
        guard let url = URL(string: "tesserone://add") else { return }
        var responder: UIResponder? = self
        let selector = sel_registerName("openURL:")
        while let current = responder {
            if current.responds(to: selector) {
                current.perform(selector, with: url)
                return
            }
            responder = current.next
        }
        extensionContext?.open(url, completionHandler: nil)
    }
}
