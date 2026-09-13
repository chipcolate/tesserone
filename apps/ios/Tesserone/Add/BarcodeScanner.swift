import AVFoundation
import CoreMedia
import PhotosUI
import SwiftUI
import TesseroneKit
import Vision
import VisionKit

struct PhotoLibraryPicker: UIViewControllerRepresentable {
    var onPicked: (UIImage) -> Void
    var onCancel: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration(photoLibrary: .shared())
        config.filter = .images
        config.selectionLimit = 1
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}

    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: PhotoLibraryPicker
        init(parent: PhotoLibraryPicker) { self.parent = parent }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            guard let provider = results.first?.itemProvider else {
                parent.onCancel()
                return
            }
            if provider.canLoadObject(ofClass: UIImage.self) {
                provider.loadObject(ofClass: UIImage.self) { object, _ in
                    DispatchQueue.main.async {
                        if let image = object as? UIImage {
                            self.parent.onPicked(image)
                        } else {
                            self.parent.onCancel()
                        }
                    }
                }
            } else {
                parent.onCancel()
            }
        }
    }
}

struct BarcodeScannerScreen: View {
    var hint: String
    var onCode: (String, BarcodeFormat) -> Void
    var onCancel: () -> Void

    private var usesDataScanner: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }

    var body: some View {
        ZStack {
            if usesDataScanner {
                DataScannerHost(onCode: handle)
                    .ignoresSafeArea()
            } else {
                AVScannerHost(onCode: handle)
                    .ignoresSafeArea()
            }

            VStack {
                HStack {
                    Button(action: onCancel) {
                        Text("✕")
                            .font(Mono.font(.regular, size: 20))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(Color.black.opacity(0.5))
                            .clipShape(RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .padding(.leading, 12)
                    .padding(.top, 12)
                    Spacer()
                }
                Spacer()
            }

            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: RawGeometry.chromeRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.6), lineWidth: 2)
                    .frame(width: 260, height: 160)
                Text(hint)
                    .font(Mono.font(.medium, size: 14))
                    .foregroundStyle(.white)
            }
            .allowsHitTesting(false)
        }
        .background(Color.black.ignoresSafeArea())
    }

    private func handle(_ code: String, _ format: BarcodeFormat) {
        let fixed = Barcode.fixScannedCode(code.trimmingCharacters(in: .whitespacesAndNewlines), format: format)
        onCode(fixed.code, fixed.format)
    }
}

private struct DataScannerHost: UIViewControllerRepresentable {
    var onCode: (String, BarcodeFormat) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(
            recognizedDataTypes: [
                .barcode(symbologies: [
                    .qr, .ean13, .ean8, .code128, .code39, .upce, .pdf417, .aztec, .dataMatrix, .itf14,
                ]),
            ],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: false,
            isHighlightingEnabled: true
        )
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: DataScannerViewController, context: Context) {
        context.coordinator.onCode = onCode
        if !uiViewController.isScanning {
            try? uiViewController.startScanning()
        }
    }

    static func dismantleUIViewController(_ uiViewController: DataScannerViewController, coordinator: Coordinator) {
        uiViewController.stopScanning()
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var onCode: (String, BarcodeFormat) -> Void
        private var locked = false
        init(onCode: @escaping (String, BarcodeFormat) -> Void) { self.onCode = onCode }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            emit(addedItems, scanner: dataScanner)
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            emit([item], scanner: dataScanner)
        }

        private func emit(_ items: [RecognizedItem], scanner: DataScannerViewController) {
            guard !locked else { return }
            for item in items {
                if case .barcode(let barcode) = item, let payload = barcode.payloadStringValue, !payload.isEmpty {
                    locked = true
                    let format = ImageBarcodeDetector.mapSymbology(barcode.observation.symbology)
                    scanner.stopScanning()
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    onCode(payload, format)
                    return
                }
            }
        }
    }
}

private struct AVScannerHost: UIViewControllerRepresentable {
    var onCode: (String, BarcodeFormat) -> Void

    func makeUIViewController(context: Context) -> AVBarcodeScannerViewController {
        let vc = AVBarcodeScannerViewController()
        vc.onCode = onCode
        return vc
    }

    func updateUIViewController(_ uiViewController: AVBarcodeScannerViewController, context: Context) {
        uiViewController.onCode = onCode
    }
}

final class AVBarcodeScannerViewController: UIViewController, AVCaptureVideoDataOutputSampleBufferDelegate {
    var onCode: ((String, BarcodeFormat) -> Void)?
    private let session = AVCaptureSession()
    private let output = AVCaptureVideoDataOutput()
    private let queue = DispatchQueue(label: "com.chipcolate.tesserone.scan")
    private var preview: AVCaptureVideoPreviewLayer?
    private var locked = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        session.beginConfiguration()
        session.sessionPreset = .high
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input)
        else {
            session.commitConfiguration()
            return
        }
        session.addInput(input)
        output.alwaysDiscardsLateVideoFrames = true
        output.setSampleBufferDelegate(self, queue: queue)
        if session.canAddOutput(output) { session.addOutput(output) }
        session.commitConfiguration()

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.insertSublayer(layer, at: 0)
        preview = layer
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        queue.async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        queue.async { [weak self] in
            self?.session.stopRunning()
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !locked, let pixel = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let request = VNDetectBarcodesRequest()
        request.symbologies = [
            .qr, .ean13, .ean8, .code128, .code39, .pdf417, .aztec, .dataMatrix, .itf14, .upce,
        ]
        let handler = VNImageRequestHandler(cvPixelBuffer: pixel, orientation: .right, options: [:])
        try? handler.perform([request])
        guard let obs = request.results?.first,
              let payload = obs.payloadStringValue,
              !payload.isEmpty
        else { return }
        locked = true
        let format = ImageBarcodeDetector.mapSymbology(obs.symbology)
        DispatchQueue.main.async { [weak self] in
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            self?.onCode?(payload, format)
        }
    }
}
