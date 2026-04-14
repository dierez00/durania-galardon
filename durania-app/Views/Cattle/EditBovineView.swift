import SwiftUI
import SwiftData

struct EditBovineView: View {

    @Environment(\.dismiss) var dismiss
    @Environment(\.modelContext) private var modelContext

    let bovine: Bovine
    @State private var showDeleteAlert = false

    @State private var healthStatus: HealthStatus
    @State private var weight: String
    @State private var name: String
    @State private var age: String
    @State private var ranch: String

    init(bovine: Bovine) {
        self.bovine = bovine
        _healthStatus = State(initialValue: bovine.healthStatus)
        _weight     = State(initialValue: "\(Int(bovine.weight))")
        _name       = State(initialValue: bovine.name ?? "")
        _age        = State(initialValue: "\(bovine.age)")
        _ranch      = State(initialValue: bovine.ranch)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {

                    // MARK: - Estado sanitario
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Estado sanitario", systemImage: "cross.case.fill")
                            .font(.headline)
                            .foregroundColor(AppColors.forestGreen)

                        HStack(spacing: 12) {
                            ForEach(HealthStatus.allCases, id: \.self) { status in
                                statusCard(status)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(18)

                    // MARK: - Datos básicos
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Datos del animal", systemImage: "doc.text.fill")
                            .font(.headline)
                            .foregroundColor(AppColors.forestGreen)

                        fieldRow(icon: "tag.fill", label: "Nombre", placeholder: "Opcional") {
                            TextField("Nombre", text: $name)
                        }

                        Divider().padding(.leading, 36)

                        fieldRow(icon: "scalemass.fill", label: "Peso (kg)", placeholder: "") {
                            TextField("Peso", text: $weight)
                                .keyboardType(.decimalPad)
                        }

                        Divider().padding(.leading, 36)

                        fieldRow(icon: "calendar", label: "Edad (años)", placeholder: "") {
                            TextField("Edad", text: $age)
                                .keyboardType(.numberPad)
                        }

                        Divider().padding(.leading, 36)

                        fieldRow(icon: "house.fill", label: "Rancho", placeholder: "") {
                            TextField("Rancho", text: $ranch)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(18)

                    // MARK: - Dar de baja
                    Button(role: .destructive) {
                        showDeleteAlert = true
                    } label: {
                        Label("Dar de baja", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(AppColors.errorBg)
                            .foregroundColor(AppColors.errorFg)
                            .cornerRadius(14)
                    }

                    // Información de solo lectura
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Identificación (solo lectura)", systemImage: "lock.fill")
                            .font(.caption)
                            .foregroundColor(.gray)

                        HStack {
                            Text("Arete")
                                .foregroundColor(.gray)
                            Spacer()
                            Text(bovine.earTag)
                                .foregroundColor(.secondary)
                                .bold()
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 4)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(18)
                }
                .padding()
            }
            .background(Color.white)
            .navigationTitle("Editar Bovino")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Dar de baja \(bovine.name ?? bovine.earTag)", isPresented: $showDeleteAlert) {
                Button("Cancelar", role: .cancel) {}
                Button("Dar de baja", role: .destructive) {
                    modelContext.delete(bovine)
                    dismiss()
                }
            } message: {
                Text("Esta acción eliminará permanentemente el registro del bovino. No se puede deshacer.")
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancelar") { dismiss() }
                        .foregroundColor(.secondary)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Guardar") { save() }
                        .bold()
                        .foregroundColor(AppColors.tealGreen)
                }
            }
        }
    }

    // MARK: - Status Card

    @ViewBuilder
    private func statusCard(_ status: HealthStatus) -> some View {
        let isSelected = healthStatus == status
        let color = colorFor(status)

        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                healthStatus = status
            }
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(isSelected ? color : color.opacity(0.12))
                        .frame(width: 44, height: 44)

                    Image(systemName: iconFor(status))
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(isSelected ? .white : color)
                }

                Text(status.rawValue)
                    .font(.caption.bold())
                    .foregroundColor(isSelected ? color : .secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(isSelected ? color.opacity(0.1) : Color(.systemGray5))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(isSelected ? color : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Field Row

    private func fieldRow<Field: View>(
        icon: String,
        label: String,
        placeholder: String,
        @ViewBuilder field: () -> Field
    ) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(AppColors.tealGreen)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.gray)
                field()
                    .font(.body)
            }
        }
    }

    // MARK: - Helpers

    private func colorFor(_ status: HealthStatus) -> Color {
        switch status {
        case .healthy:     return AppColors.tealGreen
        case .observation: return AppColors.warningFg
        case .quarantine:  return AppColors.errorFg
        }
    }

    private func iconFor(_ status: HealthStatus) -> String {
        switch status {
        case .healthy:     return "checkmark.seal.fill"
        case .observation: return "eye.fill"
        case .quarantine:  return "exclamationmark.triangle.fill"
        }
    }

    // MARK: - Save

    private func save() {
        bovine.healthStatus = healthStatus
        if let w = Double(weight), w > 0 { bovine.weight = w }
        if let a = Int(age), a > 0 { bovine.age = a }
        bovine.name = name.trimmingCharacters(in: .whitespaces).isEmpty ? nil : name.trimmingCharacters(in: .whitespaces)
        let trimmedRanch = ranch.trimmingCharacters(in: .whitespaces)
        if !trimmedRanch.isEmpty { bovine.ranch = trimmedRanch }
        dismiss()
    }
}
