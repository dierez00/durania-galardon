import SwiftUI
import AVFoundation

struct QRCodeScannerView: UIViewControllerRepresentable {
    let onCodeScanned: (String) -> Void
    let onFailure: (String) -> Void

    func makeUIViewController(context: Context) -> ScannerViewController {
        let controller = ScannerViewController()
        controller.onCodeScanned = onCodeScanned
        controller.onFailure = onFailure
        return controller
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}
}

final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCodeScanned: ((String) -> Void)?
    var onFailure: ((String) -> Void)?

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var hasScanned = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if !session.isRunning {
            session.startRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning {
            session.stopRunning()
        }
    }

    private func configureSession() {
        guard let videoDevice = AVCaptureDevice.default(for: .video) else {
            onFailure?("No hay cámara disponible.")
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: videoDevice)
            if session.canAddInput(input) {
                session.addInput(input)
            } else {
                onFailure?("No se pudo inicializar el escáner QR.")
                return
            }
        } catch {
            onFailure?("No se pudo acceder a la cámara: \(error.localizedDescription)")
            return
        }

        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
        } else {
            onFailure?("No se pudo leer metadatos QR.")
            return
        }

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.layer.bounds
        view.layer.addSublayer(preview)
        previewLayer = preview

        session.startRunning()
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !hasScanned else { return }
        guard let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              object.type == .qr,
              let value = object.stringValue else {
            return
        }

        hasScanned = true
        session.stopRunning()
        onCodeScanned?(value)
    }
}
