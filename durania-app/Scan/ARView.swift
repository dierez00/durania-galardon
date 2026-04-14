import SwiftUI
import RealityKit
import ARKit
import UIKit

// MARK: - Vista Principal AR

struct ARScanView: View {

    @Environment(\.dismiss) var dismiss
    let onBovineTap: (String) -> Void
    let bovineInfo: ((String) -> (status: String, ranch: String)?)?

    init(
        onBovineTap: @escaping (String) -> Void = { _ in },
        bovineInfo: ((String) -> (status: String, ranch: String)?)? = nil
    ) {
        self.onBovineTap = onBovineTap
        self.bovineInfo = bovineInfo
    }

    var body: some View {
        ZStack {
            ARViewContainer(onBovineTap: onBovineTap, bovineInfo: bovineInfo)
                .edgesIgnoringSafeArea(.all)

            VStack {
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                            Text("Volver")
                        }
                        .font(.headline)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial)
                        .cornerRadius(16)
                    }
                    .padding(.leading, 16)
                    .padding(.top, 14)

                    Spacer()
                }

                Spacer()
            }
        }
    }
}

// MARK: - Contenedor AR

struct ARViewContainer: UIViewRepresentable {
    let onBovineTap: (String) -> Void
    let bovineInfo: ((String) -> (status: String, ranch: String)?)?

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)

        let config = ARImageTrackingConfiguration()

        guard let referenceImages = ARReferenceImage.referenceImages(
            inGroupNamed: "CodigosGanado",
            bundle: nil
        ) else {
            print("⚠️ No se encontraron imágenes AR")
            return arView
        }

        config.trackingImages = referenceImages
        config.maximumNumberOfTrackedImages = 1

        arView.session.delegate = context.coordinator
        let tapRecognizer = UITapGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleSceneTap(_:))
        )
        arView.addGestureRecognizer(tapRecognizer)
        arView.session.run(config)

        context.coordinator.view = arView
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        context.coordinator.onBovineTap = onBovineTap
        context.coordinator.bovineInfo = bovineInfo
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onBovineTap: onBovineTap, bovineInfo: bovineInfo)
    }

    // MARK: - Coordinator

    @MainActor
    class Coordinator: NSObject, ARSessionDelegate {
        weak var view: ARView?
        var onBovineTap: (String) -> Void
        var bovineInfo: ((String) -> (status: String, ranch: String)?)?
        private var posterEntitiesByAnchorID: [UUID: ModelEntity] = [:]
        private var anchorEntitiesByID: [UUID: AnchorEntity] = [:]
        private var bovineIDByEntityID: [UInt64: String] = [:]
        private let visualConfig = PosterVisualConfig()

        init(
            onBovineTap: @escaping (String) -> Void,
            bovineInfo: ((String) -> (status: String, ranch: String)?)?
        ) {
            self.onBovineTap = onBovineTap
            self.bovineInfo = bovineInfo
            super.init()
        }

        private struct PosterVisualConfig {
            let width: Float = 0.22
            let height: Float = 0.12
            let cornerRadius: Float = 0.012
            let yOffset: Float = 0.10
        }

        @objc
        func handleSceneTap(_ recognizer: UITapGestureRecognizer) {
            guard recognizer.state == .ended,
                  let arView = view else { return }

            let point = recognizer.location(in: arView)
            guard let hitEntity = arView.hitTest(point, query: .nearest).first?.entity,
                  let bovineID = resolveBovineID(from: hitEntity) else {
                return
            }

            onBovineTap(bovineID)
        }

        func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
            for anchor in anchors {
                if let imageAnchor = anchor as? ARImageAnchor {
                    upsertPoster(for: imageAnchor)
                }
            }
        }

        func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
            for anchor in anchors {
                guard let imageAnchor = anchor as? ARImageAnchor else { continue }

                if posterEntitiesByAnchorID[imageAnchor.identifier] == nil {
                    upsertPoster(for: imageAnchor)
                }

                guard let currentFrame = session.currentFrame else { continue }
                updateBillboard(for: imageAnchor.identifier, frame: currentFrame)
            }
        }

        func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
            for anchor in anchors {
                let anchorID = anchor.identifier
                if let poster = posterEntitiesByAnchorID.removeValue(forKey: anchorID) {
                    bovineIDByEntityID.removeValue(forKey: poster.id)
                }

                if let anchorEntity = anchorEntitiesByID.removeValue(forKey: anchorID) {
                    view?.scene.removeAnchor(anchorEntity)
                }
            }
        }

        private func upsertPoster(for imageAnchor: ARImageAnchor) {
            guard let view = view else { return }
            let anchorID = imageAnchor.identifier
            guard posterEntitiesByAnchorID[anchorID] == nil else { return }

            let anchorEntity = AnchorEntity(anchor: imageAnchor)
            let bovineID = imageAnchor.referenceImage.name ?? "MX-00000"

            let info = bovineInfo?(bovineID)
            let status = info?.status ?? "ACTIVO"
            let action = info.map { "Rancho: \($0.ranch)" } ?? "Acción: Monitoreo normal"

            let posterEntity = makePosterEntity(
                bovineID: bovineID,
                status: status,
                action: action
            )
            posterEntity.generateCollisionShapes(recursive: true)
            posterEntity.position = .zero

            anchorEntity.addChild(posterEntity)
            view.scene.addAnchor(anchorEntity)

            posterEntitiesByAnchorID[anchorID] = posterEntity
            anchorEntitiesByID[anchorID] = anchorEntity
            bovineIDByEntityID[posterEntity.id] = bovineID
        }

        private func makePosterEntity(bovineID: String, status: String, action: String) -> ModelEntity {
            let mesh = MeshResource.generatePlane(
                width: visualConfig.width,
                height: visualConfig.height,
                cornerRadius: visualConfig.cornerRadius
            )

            if let texture = makePosterTexture(for: bovineID, status: status, action: action) {
                let material = UnlitMaterial(texture: texture)
                return ModelEntity(mesh: mesh, materials: [material])
            }

            let fallbackMaterial = SimpleMaterial(
                color: UIColor(red: 0.015, green: 0.18, blue: 0.20, alpha: 0.9),
                isMetallic: false
            )
            let fallbackPanel = ModelEntity(mesh: mesh, materials: [fallbackMaterial])
            let textMesh = MeshResource.generateText(
                "\(bovineID)\n\(status)",
                extrusionDepth: 0.001,
                font: .systemFont(ofSize: 0.012, weight: .semibold),
                containerFrame: CGRect(x: -0.09, y: -0.03, width: 0.18, height: 0.06),
                alignment: .center,
                lineBreakMode: .byWordWrapping
            )
            let textMaterial = SimpleMaterial(color: .white, isMetallic: false)
            let textEntity = ModelEntity(mesh: textMesh, materials: [textMaterial])
            textEntity.position = [0, 0, 0.0015]
            fallbackPanel.addChild(textEntity)
            return fallbackPanel
        }

        private func makePosterTexture(for id: String, status: String, action: String) -> TextureResource? {
            let size = CGSize(width: 1024, height: 560)
            let renderer = UIGraphicsImageRenderer(size: size)

            let image = renderer.image { context in
                let cg = context.cgContext
                let rect = CGRect(origin: .zero, size: size)

                let bgPath = UIBezierPath(roundedRect: rect, cornerRadius: 44)
                UIColor(red: 0.015, green: 0.18, blue: 0.20, alpha: 0.92).setFill()
                bgPath.fill()

                UIColor(white: 1.0, alpha: 0.28).setStroke()
                bgPath.lineWidth = 6
                bgPath.stroke()

                let iconName: String
                let iconColor: UIColor
                switch status.uppercased() {
                case "SANO":
                    iconName = "checkmark.seal.fill"
                    iconColor = UIColor(red: 0.306, green: 0.769, blue: 0.627, alpha: 1)
                case "OBSERVACIÓN", "OBSERVACION":
                    iconName = "eye.fill"
                    iconColor = UIColor(red: 0.910, green: 0.455, blue: 0.106, alpha: 1)
                case "CUARENTENA":
                    iconName = "exclamationmark.triangle.fill"
                    iconColor = UIColor(red: 0.820, green: 0.263, blue: 0.267, alpha: 1)
                default:
                    iconName = "checkmark.seal.fill"
                    iconColor = UIColor(red: 0.306, green: 0.769, blue: 0.627, alpha: 1)
                }

                if let icon = UIImage(systemName: iconName)?.withTintColor(iconColor, renderingMode: .alwaysOriginal) {
                    icon.draw(in: CGRect(x: 38, y: 34, width: 68, height: 68))
                }

                let headerStyle = NSMutableParagraphStyle()
                headerStyle.alignment = .left
                let headerAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 40, weight: .semibold),
                    .foregroundColor: UIColor(white: 1.0, alpha: 0.88),
                    .paragraphStyle: headerStyle
                ]
                let mainAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.monospacedSystemFont(ofSize: 86, weight: .bold),
                    .foregroundColor: UIColor.white
                ]
                let subAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 38, weight: .medium),
                    .foregroundColor: UIColor(white: 1.0, alpha: 0.9)
                ]

                NSString(string: "BOVINO DETECTADO")
                    .draw(in: CGRect(x: 124, y: 40, width: 860, height: 60), withAttributes: headerAttrs)
                NSString(string: id)
                    .draw(in: CGRect(x: 40, y: 118, width: 920, height: 110), withAttributes: mainAttrs)

                let badgeRect = CGRect(x: 40, y: 252, width: 300, height: 84)
                let badgePath = UIBezierPath(roundedRect: badgeRect, cornerRadius: 22)
                let statusColor: UIColor
                switch status.uppercased() {
                case "SANO":
                    statusColor = UIColor(red: 0.306, green: 0.769, blue: 0.627, alpha: 0.95)
                case "OBSERVACIÓN", "OBSERVACION":
                    statusColor = UIColor(red: 0.910, green: 0.455, blue: 0.106, alpha: 0.95)
                case "CUARENTENA":
                    statusColor = UIColor(red: 0.820, green: 0.263, blue: 0.267, alpha: 0.95)
                default:
                    statusColor = UIColor(red: 0.306, green: 0.769, blue: 0.627, alpha: 0.95)
                }
                statusColor.setFill()
                badgePath.fill()

                let badgeAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 34, weight: .bold),
                    .foregroundColor: UIColor.white
                ]
                NSString(string: status.uppercased())
                    .draw(in: CGRect(x: 60, y: 274, width: 270, height: 42), withAttributes: badgeAttrs)

                NSString(string: action)
                    .draw(in: CGRect(x: 40, y: 370, width: 940, height: 70), withAttributes: subAttrs)

                cg.saveGState()
                cg.setShadow(offset: CGSize(width: 0, height: 12), blur: 20, color: UIColor.black.cgColor)
                UIColor.clear.setFill()
                cg.fill(CGRect(x: 0, y: size.height - 24, width: size.width, height: 1))
                cg.restoreGState()
            }

            guard let cgImage = image.cgImage else { return nil }

            do {
                return try TextureResource.generate(
                    from: cgImage,
                    options: .init(semantic: .color)
                )
            } catch {
                return nil
            }
        }

        private func updateBillboard(for anchorID: UUID, frame: ARFrame) {
            guard let poster = posterEntitiesByAnchorID[anchorID],
                  let anchorEntity = anchorEntitiesByID[anchorID] else {
                return
            }

            let cameraWorld = SIMD3<Float>(
                frame.camera.transform.columns.3.x,
                frame.camera.transform.columns.3.y,
                frame.camera.transform.columns.3.z
            )
            let anchorWorld = SIMD3<Float>(
                anchorEntity.transformMatrix(relativeTo: nil).columns.3.x,
                anchorEntity.transformMatrix(relativeTo: nil).columns.3.y,
                anchorEntity.transformMatrix(relativeTo: nil).columns.3.z
            )
            let posterWorld = anchorWorld + SIMD3<Float>(0, visualConfig.yOffset, 0)
            poster.setPosition(posterWorld, relativeTo: nil)

            poster.look(
                at: cameraWorld,
                from: posterWorld,
                upVector: [0, 1, 0],
                relativeTo: nil,
                forward: .positiveZ
            )
        }

        private func resolveBovineID(from entity: Entity) -> String? {
            var current: Entity? = entity

            while let node = current {
                if let bovineID = bovineIDByEntityID[node.id] {
                    return bovineID
                }
                current = node.parent
            }

            return nil
        }
    }
}
