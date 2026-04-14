import Foundation

enum NFCServiceError: LocalizedError {
    case simulationFailed

    var errorDescription: String? {
        switch self {
        case .simulationFailed:
            return "No se pudo completar el escaneo NFC simulado."
        }
    }
}

protocol NFCServiceProtocol {
    func startSimulatedScan(completion: @escaping (Result<NFCTagData, Error>) -> Void)
}

final class NFCService: NFCServiceProtocol {
    func startSimulatedScan(completion: @escaping (Result<NFCTagData, Error>) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let payload = NFCTagData(
                rawValue: "https://api.durania.app/bovine/MX-20394",
                source: .nfc,
                scannedAt: Date()
            )

            completion(.success(payload))
        }
    }
}
