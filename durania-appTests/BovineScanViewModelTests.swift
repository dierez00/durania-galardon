import Foundation
import Testing
@testable import durania_app

struct BovineScanViewModelTests {
    @MainActor
    @Test func parsesURLAndFindsBovine() {
        let viewModel = BovineScanViewModel(nfcService: MockNFCService())

        viewModel.handleScan(
            rawValue: "https://api.durania.app/bovine/MX-20394",
            source: .qr
        )

        #expect(viewModel.selectedBovine?.earTag == "MX-20394")
        #expect(viewModel.errorMessage == nil)
    }

    @MainActor
    @Test func parsesPlainTagAndFindsBovine() {
        let viewModel = BovineScanViewModel(nfcService: MockNFCService())

        viewModel.handleScan(rawValue: "mx-20395", source: .qr)

        #expect(viewModel.selectedBovine?.earTag == "MX-20395")
        #expect(viewModel.errorMessage == nil)
    }

    @MainActor
    @Test func showsInvalidCodeError() {
        let viewModel = BovineScanViewModel(nfcService: MockNFCService())

        viewModel.handleScan(rawValue: "ABC", source: .qr)

        #expect(viewModel.selectedBovine == nil)
        #expect(viewModel.errorMessage == "Código inválido")
    }

    @MainActor
    @Test func showsNotFoundError() {
        let viewModel = BovineScanViewModel(nfcService: MockNFCService())

        viewModel.handleScan(rawValue: "MX-99999", source: .qr)

        #expect(viewModel.selectedBovine == nil)
        #expect(viewModel.errorMessage == "Animal no encontrado")
    }

    @MainActor
    @Test func startsNFCAndThenLoadsBovine() async throws {
        let payload = NFCTagData(
            rawValue: "https://api.durania.app/bovine/MX-20394",
            source: .nfc,
            scannedAt: Date()
        )
        let viewModel = BovineScanViewModel(
            nfcService: MockNFCService(result: .success(payload), delay: 0.05)
        )

        viewModel.startNFCScan()
        #expect(viewModel.isScanningNFC == true)

        try await Task.sleep(for: .milliseconds(120))

        #expect(viewModel.isScanningNFC == false)
        #expect(viewModel.selectedBovine?.earTag == "MX-20394")
        #expect(viewModel.errorMessage == nil)
    }
}

private final class MockNFCService: NFCServiceProtocol {
    private let result: Result<NFCTagData, Error>
    private let delay: TimeInterval

    init(
        result: Result<NFCTagData, Error> = .failure(NFCServiceError.simulationFailed),
        delay: TimeInterval = 0
    ) {
        self.result = result
        self.delay = delay
    }

    func startSimulatedScan(completion: @escaping (Result<NFCTagData, Error>) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            completion(self.result)
        }
    }
}
