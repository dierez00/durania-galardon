import SwiftUI
import MapKit

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {

            HomeView(selectedTab: $selectedTab)
                .tabItem {
                    Label("Inicio", systemImage: "house.fill")
                }
                .tag(0)

            CattleListView()
                .tabItem {
                    Label("Bovinos", systemImage: "list.bullet.rectangle")
                }
                .tag(1)

            ScanView()
                .tabItem {
                    Label("Escanear", systemImage: "dot.radiowaves.left.and.right")
                }
                .tag(2)

            ReportsView()
                .tabItem {
                    Label("Reportes", systemImage: "chart.bar.xaxis")
                }
                .tag(3)

            CattleLocationView()
                .tabItem {
                    Label("Ubicación", systemImage: "map.fill")
                }
                .tag(4)
        }
        .tint(AppColors.primary)
        .task {
            // Pre-warm MapKit: fuerza la inicializacion del renderer Metal antes
            // de que el usuario navegue al tab de ubicacion, evitando el freeze de ~2s.
            // Frame 1x1 para que CAMetalLayer no lance el warning de size 0x0.
            _ = MKMapView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
        }
    }
}

#Preview {
    MainTabView()
}
