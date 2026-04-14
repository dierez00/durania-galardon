import Foundation
import SwiftData
internal import Combine

@MainActor
final class BovineScanViewModel: ObservableObject {
    @Published var selectedBovine: Bovine?
    @Published var errorMessage: String?
    @Published var isScanningNFC = false

    var modelContext: ModelContext?

    private let nfcService: NFCServiceProtocol

    init(nfcService: NFCServiceProtocol) {
        self.nfcService = nfcService
    }

    convenience init() {
        self.init(nfcService: NFCService())
    }

    func startNFCScan() {
        clearError()
        isScanningNFC = true

        nfcService.startSimulatedScan { [weak self] result in
            guard let self else { return }
            self.isScanningNFC = false

            switch result {
            case .success(let data):
                self.handleScan(rawValue: data.rawValue, source: data.source)
            case .failure:
                self.selectedBovine = nil
                self.errorMessage = "No se pudo completar el escaneo NFC."
            }
        }
    }

    func handleScan(rawValue: String, source: ScanSource) {
        _ = source
        clearError()

        guard let tag = extractEarTag(from: rawValue) else {
            selectedBovine = nil
            errorMessage = "Código inválido"
            return
        }

        guard let context = modelContext else {
            selectedBovine = nil
            errorMessage = "Sin acceso a datos locales"
            return
        }

        let descriptor = FetchDescriptor<Bovine>(
            predicate: #Predicate { $0.earTag == tag }
        )

        guard let bovine = try? context.fetch(descriptor).first else {
            selectedBovine = nil
            errorMessage = "Animal no encontrado: \(tag)"
            return
        }

        selectedBovine = bovine
    }

    func clearError() {
        errorMessage = nil
    }

    // MARK: - Helpers

    private func extractEarTag(from value: String) -> String? {
        let sanitized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !sanitized.isEmpty else { return nil }

        if isValidEarTag(sanitized.uppercased()) {
            return sanitized.uppercased()
        }

        if let components = URLComponents(string: sanitized), !components.path.isEmpty {
            let segments = components.path
                .split(separator: "/")
                .map { String($0).uppercased() }

            if let firstValid = segments.first(where: { isValidEarTag($0) }) {
                return firstValid
            }
        }

        return nil
    }

    private func isValidEarTag(_ value: String) -> Bool {
        let pattern = #"^[A-Z]{2}-[0-9]{3,}$"#
        return value.range(of: pattern, options: .regularExpression) != nil
    }
}
