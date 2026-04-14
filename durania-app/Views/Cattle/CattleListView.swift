import SwiftUI
import SwiftData

struct CattleListView: View {

    @Query(sort: \Bovine.earTag) var bovines: [Bovine]
    @Environment(\.modelContext) private var modelContext
    @State private var searchText = ""
    @State private var showAddModal = false
    @State private var bovineToDelete: Bovine?

    var filteredBovines: [Bovine] {
        if searchText.isEmpty { return bovines }
        return bovines.filter {
            $0.earTag.localizedCaseInsensitiveContains(searchText) ||
            ($0.name?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 14) {
                    ForEach(filteredBovines) { bovine in
                        NavigationLink {
                            BovineDetailView(bovine: bovine)
                        } label: {
                            cattleCard(bovine)
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button(role: .destructive) {
                                bovineToDelete = bovine
                            } label: {
                                Label("Dar de baja", systemImage: "trash")
                            }
                        }
                    }
                }
                .padding()
            }
            .background(Color.white)
            .navigationTitle("Ganado")
            .searchable(text: $searchText, prompt: "Buscar arete o nombre")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddModal.toggle()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(AppColors.tealGreen)
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showAddModal) {
                AddCattleView()
            }
            .alert(
                "Dar de baja \(bovineToDelete?.name ?? bovineToDelete?.earTag ?? "")",
                isPresented: Binding(
                    get: { bovineToDelete != nil },
                    set: { if !$0 { bovineToDelete = nil } }
                )
            ) {
                Button("Cancelar", role: .cancel) { bovineToDelete = nil }
                Button("Dar de baja", role: .destructive) {
                    if let b = bovineToDelete {
                        modelContext.delete(b)
                        bovineToDelete = nil
                    }
                }
            } message: {
                Text("Esta acción eliminará permanentemente el registro del bovino. No se puede deshacer.")
            }
        }
    }

    // MARK: - Card

    func cattleCard(_ bovine: Bovine) -> some View {
        HStack(spacing: 14) {
            Circle()
                .fill(statusColor(bovine.healthStatus))
                .frame(width: 12, height: 12)

            VStack(alignment: .leading, spacing: 4) {
                Text(bovine.earTag)
                    .font(.headline)
                    .foregroundColor(AppColors.forestGreen)

                if let name = bovine.name {
                    Text(name)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Text("\(bovine.age) año\(bovine.age == 1 ? "" : "s") · \(bovine.breed)")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            Text(bovine.healthStatus.rawValue)
                .font(.caption.bold())
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(statusColor(bovine.healthStatus).opacity(0.15))
                .foregroundColor(statusColor(bovine.healthStatus))
                .cornerRadius(12)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(18)
    }

    // MARK: - Helpers

    func statusColor(_ status: HealthStatus) -> Color {
        switch status {
        case .healthy: return AppColors.tealGreen
        case .observation: return AppColors.warningFg
        case .quarantine: return AppColors.errorFg
        }
    }
}

#Preview {
    CattleListView()
        .modelContainer(for: Bovine.self, inMemory: true)
}
