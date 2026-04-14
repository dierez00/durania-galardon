import Foundation
import Observation

@MainActor
@Observable
final class CollarStreamService {
    var liveLocation: CowLocation?
    var isConnected = false

    private let collarId = "COLLAR-001"
    private let earTag = "MX-20395"
    private let tenantId = "79e6b3f3-c00e-4e99-a43c-b9192883e7ee"

    private var streamTask: Task<Void, Never>?

    func start() {
        guard streamTask == nil else { return }
        streamTask = Task { [weak self] in
            await self?.connect()
        }
    }

    func stop() {
        streamTask?.cancel()
        streamTask = nil
        isConnected = false
    }

    private func connect() async {
        guard !Task.isCancelled else { return }

        var components = URLComponents(string: "https://backend-iot-production.up.railway.app/api/collars/\(collarId)/realtime/stream")!
        components.queryItems = [URLQueryItem(name: "tenantId", value: tenantId)]
        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = .infinity

        do {
            let (asyncBytes, _) = try await URLSession.shared.bytes(for: request)
            isConnected = true

            for try await line in asyncBytes.lines {
                if Task.isCancelled { break }

                guard line.hasPrefix("data:") else { continue }
                let json = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                guard !json.isEmpty, let data = json.data(using: .utf8) else { continue }

                if let event = try? JSONDecoder().decode(CollarStreamEvent.self, from: data) {
                    liveLocation = makeCowLocation(from: event.data)
                }
            }
        } catch {
            // stream ended or cancelled — reconnect if not intentionally stopped
        }

        isConnected = false

        if !Task.isCancelled {
            try? await Task.sleep(for: .seconds(3))
            await connect()
        }
    }

    private func makeCowLocation(from reading: CollarReading) -> CowLocation {
        let lat = Double(reading.lat) ?? 0
        let lon = Double(reading.lon) ?? 0
        let spd = Double(reading.spd) ?? 0
        let status: CowStatus = spd > 0 ? .moving : .stopped
        let lastUpdate = relativeTime(from: reading.timestamp)

        return CowLocation(
            earTag: earTag,
            name: "Niebla",
            latitude: lat,
            longitude: lon,
            status: status,
            lastUpdate: lastUpdate,
            batteryPercent: Int(reading.bat_percent),
            temperature: Double(reading.temp)
        )
    }

    private func relativeTime(from isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "Ahora" }
        let seconds = Int(-date.timeIntervalSinceNow)
        if seconds < 60 { return "Hace \(seconds)s" }
        return "Hace \(seconds / 60)m"
    }
}
