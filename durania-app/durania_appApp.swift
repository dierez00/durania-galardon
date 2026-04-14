import SwiftUI
import SwiftData

@main
struct durania_appApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Bovine.self,
            Vaccine.self,
            HealthEvent.self,
        ])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )
        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .onAppear {
                    seedInitialDataIfNeeded()
                }
        }
        .modelContainer(sharedModelContainer)
    }

    // MARK: - Semilla inicial

    private func seedInitialDataIfNeeded() {
        let context = sharedModelContainer.mainContext
        let descriptor = FetchDescriptor<Bovine>()
        guard let count = try? context.fetchCount(descriptor), count == 0 else { return }

        let luna = Bovine(
            earTag: "MX-20394",
            name: "Luna",
            age: 2,
            breed: "Angus",
            sex: "Hembra",
            weight: 430,
            healthStatus: .healthy,
            lastVaccine: Date(),
            ranch: "Rancho El Roble"
        )
        luna.vaccines = [
            Vaccine(name: "Brucelosis", dose: "1ra", date: Date().addingTimeInterval(-86400 * 30), batch: "BRX-22", nextDose: Date().addingTimeInterval(86400 * 180)),
            Vaccine(name: "Tuberculosis", dose: "Refuerzo", date: Date().addingTimeInterval(-86400 * 90), batch: "TBC-10")
        ]
        luna.events = [
            HealthEvent(title: "Revisión médica", description: "Chequeo general sin anomalías", date: Date().addingTimeInterval(-86400 * 7)),
            HealthEvent(title: "Desparasitación", description: "Tratamiento preventivo", date: Date().addingTimeInterval(-86400 * 60))
        ]

        let niebla = Bovine(
            earTag: "MX-20395",
            name: "Niebla",
            age: 1,
            breed: "Brahman",
            sex: "Hembra",
            weight: 390,
            healthStatus: .observation,
            lastVaccine: Date().addingTimeInterval(-86400 * 30),
            ranch: "Rancho El Roble"
        )
        niebla.vaccines = [
            Vaccine(name: "Brucelosis", dose: "1ra", date: Date().addingTimeInterval(-86400 * 30), batch: "BRX-22")
        ]
        niebla.events = [
            HealthEvent(title: "En observación", description: "Pérdida leve de peso", date: Date().addingTimeInterval(-86400 * 14))
        ]

        let rayo = Bovine(
            earTag: "MX-20396",
            name: "Rayo",
            age: 3,
            breed: "Charolais",
            sex: "Macho",
            weight: 470,
            healthStatus: .quarantine,
            lastVaccine: Date().addingTimeInterval(-86400 * 60),
            ranch: "Rancho El Roble"
        )
        rayo.vaccines = [
            Vaccine(name: "Tuberculosis", dose: "Prueba", date: Date().addingTimeInterval(-86400 * 60), batch: "TBC-10")
        ]
        rayo.events = [
            HealthEvent(title: "Cuarentena iniciada", description: "Síntomas respiratorios, aislamiento preventivo", date: Date().addingTimeInterval(-86400 * 5))
        ]

        let brisa = Bovine(
            earTag: "MX-20397",
            name: "Brisa",
            age: 1,
            breed: "Angus",
            sex: "Hembra",
            weight: 360,
            healthStatus: .healthy,
            lastVaccine: Date().addingTimeInterval(-86400 * 15),
            ranch: "Rancho El Roble"
        )
        brisa.vaccines = [
            Vaccine(name: "Brucelosis", dose: "1ra", date: Date().addingTimeInterval(-86400 * 15), batch: "BRX-23", nextDose: Date().addingTimeInterval(86400 * 165))
        ]
        brisa.events = [
            HealthEvent(title: "Alta médica", description: "Sin anomalías detectadas", date: Date().addingTimeInterval(-86400 * 15))
        ]

        context.insert(luna)
        context.insert(niebla)
        context.insert(rayo)
        context.insert(brisa)
    }
}
