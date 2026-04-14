import SwiftUI
import SwiftData

struct HomeView: View {

    @Binding var selectedTab: Int
    @Query var bovines: [Bovine]

    var totalCount: Int { bovines.count }
    var observationCount: Int { bovines.filter { $0.healthStatus == .observation }.count }
    var quarantineCount: Int { bovines.filter { $0.healthStatus == .quarantine }.count }
    var pendingVaccinesCount: Int {
        let soon = Date().addingTimeInterval(86400 * 30)
        return bovines.flatMap { $0.vaccines }.filter { v in
            guard let next = v.nextDose else { return false }
            return next <= soon
        }.count
    }

    private struct UpcomingVaccine: Identifiable {
        let id = UUID()
        let vaccine: Vaccine
        let bovine: Bovine
    }

    private var upcomingVaccines: [UpcomingVaccine] {
        bovines.flatMap { b in
            b.vaccines.compactMap { v -> UpcomingVaccine? in
                guard v.nextDose != nil else { return nil }
                return UpcomingVaccine(vaccine: v, bovine: b)
            }
        }
        .sorted { $0.vaccine.nextDose! < $1.vaccine.nextDose! }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    headerSection
                    statsGrid
                    upcomingVaccinesSection
                    quickActions
                }
                .padding()
            }
            .background(Color.white)
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    var headerSection: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Buen día👋")
                    .font(.title2)
                    .bold()
                    .foregroundColor(AppColors.forestGreen)

                Text("Rancho El Roble · Durango")
                    .foregroundColor(.gray)
                    .font(.subheadline)
            }

            Spacer()

            NavigationLink {
                ProfileView()
            } label: {
                ZStack {
                    Circle()
                        .fill(AppColors.tealGreen.opacity(0.15))
                        .frame(width: 44, height: 44)

                    Image(systemName: "person.crop.circle.fill")
                        .font(.title2)
                        .foregroundColor(AppColors.forestGreen)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Stats Grid

    var statsGrid: some View {
        LazyVGrid(
            columns: [GridItem(.flexible()), GridItem(.flexible())],
            spacing: 16
        ) {
            DashboardCard(
                title: "Bovinos",
                value: "\(totalCount)",
                icon: "",
                color: AppColors.primary,
                assetImage: "vaca"
            )

            DashboardCard(
                title: "Vacunas Pendientes",
                value: "\(pendingVaccinesCount)",
                icon: "cross.case.fill",
                color: AppColors.primary
            )

            DashboardCard(
                title: "Observación",
                value: "\(observationCount)",
                icon: "eye.fill",
                color: AppColors.primary
            )

            DashboardCard(
                title: "Cuarentena",         
                value: "\(quarantineCount)",
                icon: "exclamationmark.triangle.fill",
                color: AppColors.errorFg
            )
        }
    }

    // MARK: - Health Chart

    var healthChart: some View {
        let healthyCount = totalCount - observationCount - quarantineCount
        let maxVal = max(CGFloat(totalCount), 1)

        return VStack(alignment: .leading, spacing: 12) {
            Text("Estado Sanitario General")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(AppColors.forestGreen)

            HStack(alignment: .bottom, spacing: 14) {
                chartBar(value: CGFloat(healthyCount) / maxVal * 160, color: AppColors.tealGreen, label: "Sanos")
                chartBar(value: CGFloat(observationCount) / maxVal * 160, color: AppColors.warningFg, label: "Obs.")
                chartBar(value: CGFloat(quarantineCount) / maxVal * 160, color: AppColors.errorFg, label: "Cuar.")
            }
            .frame(height: 180)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(18)
    }

    func chartBar(value: CGFloat, color: Color, label: String) -> some View {
        VStack {
            RoundedRectangle(cornerRadius: 10)
                .fill(color)
                .frame(height: max(value, 4))

            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(AppColors.forestGreen.opacity(0.75))
        }
    }

    // MARK: - Upcoming Vaccines

    var upcomingVaccinesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Próximas Vacunas")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.forestGreen)
                Spacer()
                if !upcomingVaccines.isEmpty {
                    Text("\(upcomingVaccines.count) pendiente\(upcomingVaccines.count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundColor(AppColors.warningFg)
                }
            }

            if upcomingVaccines.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(AppColors.tealGreen)
                    Text("Todas las vacunas al día")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6))
                .cornerRadius(14)
            } else {
                ForEach(upcomingVaccines.prefix(4)) { item in
                    upcomingVaccineRow(item)
                }
                if upcomingVaccines.count > 4 {
                    Text("+ \(upcomingVaccines.count - 4) más")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(18)
    }

    private func upcomingVaccineRow(_ item: UpcomingVaccine) -> some View {
        let next = item.vaccine.nextDose!
        let daysLeft = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Calendar.current.startOfDay(for: next)).day ?? 0
        let urgencyColor: Color = daysLeft < 0 ? AppColors.errorFg : daysLeft <= 7 ? AppColors.warningFg : AppColors.accent

        return NavigationLink(destination: BovineDetailView(bovine: item.bovine)) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(urgencyColor)
                    .frame(width: 4, height: 38)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.vaccine.name)
                        .font(.subheadline.bold())
                        .foregroundColor(AppColors.forestGreen)
                    Text(item.bovine.name ?? item.bovine.earTag)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(daysLeft < 0 ? "Vencida" : daysLeft == 0 ? "Hoy" : "En \(daysLeft)d")
                        .font(.caption.bold())
                        .foregroundColor(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(urgencyColor)
                        .cornerRadius(6)
                    Text(next.formatted(.dateTime.day().month(.abbreviated)))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundColor(Color(.systemGray3))
            }
            .padding(10)
            .background(Color.white)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Quick Actions

    var quickActions: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Acciones rápidas")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(AppColors.forestGreen)

            HStack(spacing: 14) {
                QuickActionButton(
                    title: "Escanear",
                    icon: "dot.radiowaves.left.and.right",
                    color: AppColors.primary
                ) {
                    selectedTab = 2
                }

                QuickActionButton(
                    title: "Ubicación en tiempo real",
                    icon: "location.fill",
                    color: AppColors.primary
                ){
                    selectedTab = 4
                }
            }
        }
    }
}

#Preview {
    HomeView(selectedTab: .constant(0))
        .modelContainer(for: Bovine.self, inMemory: true)
}
