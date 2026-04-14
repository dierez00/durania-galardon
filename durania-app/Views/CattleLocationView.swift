import SwiftUI
import CoreLocation

extension CowLocation {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

private struct BovineDetailPayload: Identifiable, Hashable {
    let id = UUID()
    let bovine: Bovine
    let vaccines: [Vaccine]
    let events: [HealthEvent]

    static func == (lhs: BovineDetailPayload, rhs: BovineDetailPayload) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

private enum LocationMockData {
    static let cows: [CowLocation] = [
        CowLocation(
            earTag: "MX-20394",
            name: "Vaca #A12",
            latitude: 24.0285,
            longitude: -104.6541,
            status: .moving,
            lastUpdate: "Hace 10s"
        ),
        CowLocation(
            earTag: "MX-20395",
            name: "Vaca #B07",
            latitude: 24.0262,
            longitude: -104.6518,
            status: .stopped,
            lastUpdate: "Hace 1m"
        ),
        CowLocation(
            earTag: "MX-20396",
            name: "Toro #C01",
            latitude: 24.0291,
            longitude: -104.6550,
            status: .moving,
            lastUpdate: "Hace 5s"
        )
    ]

    static let detailsByEarTag: [String: BovineDetailPayload] = [
        "MX-20394": BovineDetailPayload(
            bovine: Bovine(
                id: UUID(),
                earTag: "MX-20394",
                name: "Luna",
                age: 2,
                breed: "Angus",
                sex: "Hembra",
                weight: 430,
                healthStatus: .healthy,
                lastVaccine: Date().addingTimeInterval(-86400 * 20),
                ranch: "Rancho El Roble"
            ),
            vaccines: [
                Vaccine(
                    id: UUID(),
                    name: "Brucelosis",
                    dose: "1ra",
                    date: Date().addingTimeInterval(-86400 * 30),
                    batch: "BRX-22",
                    nextDose: Date().addingTimeInterval(86400 * 180)
                )
            ],
            events: [
                HealthEvent(
                    id: UUID(),
                    title: "Revisión médica",
                    description: "Se mantiene estable y activa.",
                    date: Date().addingTimeInterval(-86400 * 7)
                )
            ]
        ),
        "MX-20395": BovineDetailPayload(
            bovine: Bovine(
                id: UUID(),
                earTag: "MX-20395",
                name: "Niebla",
                age: 1,
                breed: "Brahman",
                sex: "Hembra",
                weight: 390,
                healthStatus: .observation,
                lastVaccine: Date().addingTimeInterval(-86400 * 38),
                ranch: "Rancho El Roble"
            ),
            vaccines: [
                Vaccine(
                    id: UUID(),
                    name: "Tuberculosis",
                    dose: "Refuerzo",
                    date: Date().addingTimeInterval(-86400 * 90),
                    batch: "TBC-10",
                    nextDose: nil
                )
            ],
            events: [
                HealthEvent(
                    id: UUID(),
                    title: "Observación de movilidad",
                    description: "Actividad reducida en la última hora.",
                    date: Date().addingTimeInterval(-3600)
                )
            ]
        ),
        "MX-20396": BovineDetailPayload(
            bovine: Bovine(
                id: UUID(),
                earTag: "MX-20396",
                name: "Rayo",
                age: 3,
                breed: "Charolais",
                sex: "Macho",
                weight: 470,
                healthStatus: .healthy,
                lastVaccine: Date().addingTimeInterval(-86400 * 45),
                ranch: "Rancho El Roble"
            ),
            vaccines: [
                Vaccine(
                    id: UUID(),
                    name: "Clostridiosis",
                    dose: "Refuerzo",
                    date: Date().addingTimeInterval(-86400 * 60),
                    batch: "CLT-42",
                    nextDose: Date().addingTimeInterval(86400 * 120)
                )
            ],
            events: [
                HealthEvent(
                    id: UUID(),
                    title: "Movimiento alto",
                    description: "Rango de desplazamiento superior al promedio.",
                    date: Date().addingTimeInterval(-300)
                )
            ]
        )
    ]
}

struct CattleLocationView: View {
    @State private var collarService = CollarStreamService()

    // Inicializado con la primera vaca para evitar un onAppear que dispare onChange en cascada
    @State private var selectedCowID: CowLocation.ID? = LocationMockData.cows.first?.id
    @State private var selectedBovineDetail: BovineDetailPayload?
    // El mapa se renderiza solo despues del primer layout para evitar que Metal
    // se inicialice con frame 0x0, lo que bloquea el main thread ~2s
    @State private var isMapVisible = false

    /// Mock base + reemplazo en vivo para MX-20395 cuando hay datos del collar
    private var liveCows: [CowLocation] {
        LocationMockData.cows.map { cow in
            if cow.earTag == "MX-20395", let live = collarService.liveLocation {
                return live
            }
            return cow
        }
    }

    var body: some View {
        VStack(spacing: 16) {

            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text("Ubicación del ganado")
                        .font(.title2)
                        .bold()
                        .foregroundColor(AppColors.forestGreen)

                    Text("Monitoreo en tiempo real")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }

                Spacer()

                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.title2)
                    .foregroundColor(collarService.isConnected ? AppColors.successFg : .gray)
            }
            .padding(.horizontal)

            // Mapa: se monta solo despues del primer layout (frame valido)
            // para evitar que CAMetalLayer arranque con size 0x0
            Group {
                if isMapVisible {
                    MapView(cows: liveCows, selectedCowID: $selectedCowID)
                        .transition(.opacity)
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.systemGray5))
                }
            }
            .frame(height: 320)
            .padding(.horizontal)
            .task {
                isMapVisible = true
                collarService.start()
            }

            // Lista
            VStack(alignment: .leading, spacing: 12) {
                Text("Animales activos")
                    .font(.headline)
                    .padding(.horizontal)

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(liveCows) { cow in
                                CowCard(
                                    cow: cow,
                                    isSelected: selectedCowID == cow.id,
                                    onTap: {
                                        selectedCowID = cow.id
                                    },
                                    onDetailTap: {
                                        openDetail(for: cow)
                                    }
                                )
                                .id(cow.id)
                            }
                        }
                        .padding(.horizontal)
                    }
                    .onChange(of: selectedCowID) { _, newValue in
                        guard let newValue else { return }
                        proxy.scrollTo(newValue, anchor: .center)
                    }
                }
            }
        }
        .padding(.top)
        .onDisappear {
            collarService.stop()
        }
        .sheet(item: $selectedBovineDetail) { detail in
            NavigationStack {
                BovineDetailView(bovine: detail.bovine)
            }
        }
    }

    private func openDetail(for cow: CowLocation) {
        if let detail = LocationMockData.detailsByEarTag[cow.earTag] {
            selectedBovineDetail = detail
            return
        }

        let fallback = Bovine(
            id: UUID(),
            earTag: cow.earTag,
            name: cow.name,
            age: 2,
            breed: "Angus",
            sex: "Hembra",
            weight: 410,
            healthStatus: cow.status == .moving ? .healthy : .observation,
            lastVaccine: Date(),
            ranch: "Rancho El Roble"
        )
        selectedBovineDetail = BovineDetailPayload(
            bovine: fallback,
            vaccines: [],
            events: []
        )
    }
}
