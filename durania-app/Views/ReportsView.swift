import SwiftUI
import SwiftData
import Charts

// MARK: - Supporting types

private struct VacEntry: Identifiable {
    let id = UUID()
    let name: String
    let earTag: String
    let vaccines: [String]
    let hasNextDose: Bool
}

private struct WeightEntry: Identifiable {
    let id = UUID()
    let name: String
    let weight: Double
    let age: Int
}

private func statCard(title: String, value: String, color: Color) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(title)
            .font(.caption)
            .foregroundColor(.gray)
        
        Text(value)
            .font(.title2.bold())
            .foregroundColor(color)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
    .background(Color(.systemGray6))
    .cornerRadius(14)
}

// MARK: - View

struct ReportsView: View {

    @Query(sort: \Bovine.earTag) var bovines: [Bovine]

    // Hardcoded — coincide con seed inicial
    private let vacEntries: [VacEntry] = [
        VacEntry(name: "Luna",   earTag: "MX-20394", vaccines: ["Brucelosis", "Tuberculosis"], hasNextDose: true),
        VacEntry(name: "Niebla", earTag: "MX-20395", vaccines: ["Brucelosis"],                 hasNextDose: false),
        VacEntry(name: "Rayo",   earTag: "MX-20396", vaccines: ["Tuberculosis"],               hasNextDose: false),
        VacEntry(name: "Brisa",  earTag: "MX-20397", vaccines: ["Brucelosis"],                 hasNextDose: true),
    ]

    private let weightEntries: [WeightEntry] = [
        WeightEntry(name: "Luna",   weight: 430, age: 2),
        WeightEntry(name: "Niebla", weight: 390, age: 1),
        WeightEntry(name: "Rayo",   weight: 470, age: 3),
        WeightEntry(name: "Brisa",  weight: 360, age: 1),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    header
                    healthCard
                    vaccinationCard
                    growthCard
                }
                .padding()
            }
            .background(Color.white)
            .navigationTitle("Reportes")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Header

    var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Panel Analítico")
                .font(.title2.bold())
                .foregroundColor(AppColors.forestGreen)
            Text("Rancho El Roble · \(bovines.count) bovinos registrados")
                .font(.subheadline)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Sanidad General (datos reales via @Query)

    private var healthCounts: [(status: HealthStatus, count: Int)] {
        HealthStatus.allCases.map { status in
            (status, bovines.filter { $0.healthStatus == status }.count)
        }
    }

    private func colorFor(_ status: HealthStatus) -> Color {
        switch status {
        case .healthy:     return AppColors.primary
        case .observation: return AppColors.warningFg
        case .quarantine:  return AppColors.errorFg
        }
    }

    var healthCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            cardHeader(
                title: "Sanidad General",
                subtitle: "Estado actual del hato",
                icon: "heart.text.square.fill",
                accent: AppColors.primary
            )

            HStack(spacing: 10) {
                ForEach(healthCounts, id: \.status) { item in
                    VStack(spacing: 6) {
                        Text("\(item.count)")
                            .font(.title.bold())
                            .foregroundColor(colorFor(item.status))
                        Text(item.status.rawValue)
                            .font(.caption2)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(colorFor(item.status).opacity(0.1))
                    .cornerRadius(12)
                }
            }

            if !bovines.isEmpty {
                Chart {
                    ForEach(healthCounts, id: \.status) { item in
                        BarMark(
                            x: .value("Estado", item.status.rawValue),
                            y: .value("Bovinos", item.count)
                        )
                        .foregroundStyle(colorFor(item.status))
                        .cornerRadius(8)
                        .annotation(position: .top) {
                            if item.count > 0 {
                                Text("\(item.count)")
                                    .font(.caption.bold())
                                    .foregroundColor(colorFor(item.status))
                            }
                        }
                    }
                }
                .frame(height: 150)
                .chartYAxis {
                    AxisMarks(values: .stride(by: 1)) { _ in
                        AxisGridLine().foregroundStyle(Color(.systemGray5))
                        AxisValueLabel()
                    }
                }
                .chartXAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let str = value.as(String.self) {
                                Text(str)
                                    .font(.caption2)
                                    .multilineTextAlignment(.center)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 4)
    }

    // MARK: - Vacunación (hardcoded)

    private var vaccineTypeCounts: [(name: String, count: Int)] {
        var counts: [String: Int] = [:]
        for entry in vacEntries {
            for v in entry.vaccines { counts[v, default: 0] += 1 }
        }
        return counts.map { ($0.key, $0.value) }.sorted { $0.count > $1.count }
    }

    private var vaccinationCoverage: Double {
        Double(vacEntries.filter { !$0.vaccines.isEmpty }.count) / Double(vacEntries.count)
    }

    var vaccinationCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            cardHeader(
                title: "Vacunación",
                subtitle: "Cobertura y próximas dosis",
                icon: "cross.case.fill",
                accent: AppColors.primary
            )

            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(Int(vaccinationCoverage * 100))%")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(AppColors.primary)
                    Text("Cobertura vacunal")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(vacEntries.filter { $0.hasNextDose }.count)")
                        .font(.title2.bold())
                        .foregroundColor(AppColors.primary)
                    Text("con dosis\npendiente")
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.trailing)
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(AppColors.secondary.opacity(0.2))
                        .frame(height: 10)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(LinearGradient(colors: [AppColors.primary, AppColors.secondary], startPoint: .leading, endPoint: .trailing))
                        .frame(width: geo.size.width * vaccinationCoverage, height: 10)
                }
            }
            .frame(height: 10)

            Chart {
                ForEach(vaccineTypeCounts, id: \.name) { item in
                    BarMark(
                        x: .value("Vacuna", item.name),
                        y: .value("Bovinos", item.count)
                    )
                    .foregroundStyle(LinearGradient(colors: [AppColors.primary, AppColors.secondary], startPoint: .top, endPoint: .bottom))
                    .cornerRadius(6)
                    .annotation(position: .top) {
                        Text("\(item.count)")
                            .font(.caption.bold())
                            .foregroundColor(AppColors.primary)
                    }
                }
            }
            .frame(height: 140)
            .chartYAxis {
                AxisMarks(values: .stride(by: 1)) { _ in
                    AxisGridLine().foregroundStyle(Color(.systemGray5))
                    AxisValueLabel()
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let str = value.as(String.self) {
                            Text(str).font(.caption2)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 4)
    }

    // MARK: - Crecimiento

    private var avgWeight: Double {
        weightEntries.map(\.weight).reduce(0, +) / Double(weightEntries.count)
    }

    var growthCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            
            // HEADER
            cardHeader(
                title: "Crecimiento",
                subtitle: "Peso y desarrollo por animal",
                icon: "chart.line.uptrend.xyaxis",
                accent: AppColors.tealGreen
            )
            
            // MARK: - STATS
            HStack(spacing: 12) {
                
                statCard(
                    title: "Promedio",
                    value: "\(Int(avgWeight)) kg",
                    color: AppColors.tealGreen
                )
                
                statCard(
                    title: "Máximo",
                    value: "\(Int(weightEntries.map(\.weight).max() ?? 0)) kg",
                    color: AppColors.tealGreen
                )
            }
            
            // MARK: - CHART
            Chart {
                ForEach(weightEntries) { entry in
                    BarMark(
                        x: .value("Arete", entry.id.uuidString),
                        y: .value("Peso", entry.weight)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [AppColors.primary, AppColors.secondary],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .cornerRadius(6)
                    .annotation(position: .top) {
                        Text("\(Int(entry.weight))kg")
                            .font(.caption2.bold())
                            .foregroundColor(AppColors.forestGreen)
                    }
                }

                RuleMark(y: .value("Promedio", avgWeight))
                    .foregroundStyle(AppColors.accent.opacity(0.8))
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [6]))
                    .annotation(position: .trailing, alignment: .center) {
                        Text("Prom.")
                            .font(.caption2)
                            .foregroundColor(AppColors.accent)
                    }
            }
            .frame(height: 180)
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine().foregroundStyle(Color(.systemGray5))
                    AxisValueLabel()
                }
            }
            .chartXAxis(.hidden)
            
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.04), radius: 10, x: 0, y: 6)
        )
    }

    // MARK: - Card Header helper

    @ViewBuilder
    private func cardHeader(title: String, subtitle: String, icon: String, accent: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(accent.opacity(0.15))
                    .frame(width: 42, height: 42)
                Image(systemName: icon)
                    .foregroundColor(accent)
                    .font(.title3)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(AppColors.forestGreen)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            Spacer()
        }
    }
}

#Preview {
    ReportsView()
        .modelContainer(for: Bovine.self, inMemory: true)
}
