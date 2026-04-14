import SwiftUI
import SwiftData

struct BovineDetailView: View {

    let bovine: Bovine
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var showEdit = false
    @State private var showDeleteAlert = false
    @State private var showAddVaccine = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                headerSection
                statusSection
                infoSection
                vaccinesSection
                eventsSection
            }
            .padding()
        }
        .navigationTitle("Detalle Bovino")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showEdit = true
                } label: {
                    Label("Editar", systemImage: "pencil")
                        .foregroundColor(AppColors.tealGreen)
                }
            }
        }
        .sheet(isPresented: $showEdit) {
            EditBovineView(bovine: bovine)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAddVaccine) {
            AddVaccineSheet(bovine: bovine)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .alert("Dar de baja \(bovine.name ?? bovine.earTag)", isPresented: $showDeleteAlert) {
            Button("Cancelar", role: .cancel) {}
            Button("Dar de baja", role: .destructive) {
                modelContext.delete(bovine)
                dismiss()
            }
        } message: {
            Text("Esta acción eliminará permanentemente el registro del bovino. No se puede deshacer.")
        }
    }

    // MARK: - Sections

    var headerSection: some View {
        VStack(spacing: 8) {
            Image("vaca")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundColor(AppColors.tealGreen)

            Text(bovine.earTag)
                .font(.title2)
                .bold()

            if let name = bovine.name {
                Text(name)
                    .font(.title3)
                    .foregroundColor(AppColors.forestGreen)
            }

            Text(bovine.breed)
                .foregroundColor(.gray)
        }
    }

    var statusSection: some View {
        HStack {
            Text("Estado sanitario")
                .font(.headline)

            Spacer()

            Text(bovine.healthStatus.rawValue)
                .font(.caption)
                .padding(8)
                .background(statusColor)
                .foregroundColor(.white)
                .cornerRadius(10)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    var infoSection: some View {
        VStack(spacing: 12) {
            InfoRow(title: "Edad", value: "\(bovine.age) año\(bovine.age == 1 ? "" : "s")")
            InfoRow(title: "Sexo", value: bovine.sex)
            InfoRow(title: "Peso", value: "\(Int(bovine.weight)) kg")
            InfoRow(title: "Rancho", value: bovine.ranch)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    var vaccinesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Vacunas")
                    .font(.headline)
                Spacer()
                Button {
                    showAddVaccine = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(AppColors.primary)
                        .font(.title3)
                }
            }

            if bovine.vaccines.isEmpty {
                Text("Sin vacunas registradas")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(14)
            } else {
                ForEach(bovine.vaccines.sorted(by: { $0.date > $1.date })) { vaccine in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(vaccine.name)
                                .bold()
                            Spacer()
                            Text(vaccine.date.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Text("Dosis: \(vaccine.dose) · Lote: \(vaccine.batch)")
                            .font(.caption)

                        if let next = vaccine.nextDose {
                            HStack {
                                Text("Próxima: \(next.formatted(date: .abbreviated, time: .omitted))")
                                    .font(.caption2)
                                    .foregroundColor(AppColors.warningFg)
                                Spacer()
                                Button {
                                    applyVaccine(vaccine)
                                } label: {
                                    Label("Aplicar", systemImage: "checkmark.circle.fill")
                                        .font(.caption2.bold())
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(AppColors.primary)
                                        .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(14)
                }
            }
        }
    }

    var eventsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Eventos sanitarios")
                .font(.headline)

            if bovine.events.isEmpty {
                Text("Sin eventos registrados")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(14)
            } else {
                ForEach(bovine.events.sorted(by: { $0.date > $1.date })) { event in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(event.title)
                                .bold()
                            Spacer()
                            Text(event.date.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Text(event.details)
                            .font(.caption)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(14)
                }
            }
        }
    }

    private func applyVaccine(_ vaccine: Vaccine) {
        let newRecord = Vaccine(
            name: vaccine.name,
            dose: vaccine.dose,
            date: Date(),
            batch: vaccine.batch,
            nextDose: nil
        )
        newRecord.bovine = bovine
        bovine.vaccines.append(newRecord)
        modelContext.insert(newRecord)
        vaccine.nextDose = nil
    }

    var statusColor: Color {
        switch bovine.healthStatus {
        case .healthy: return AppColors.successFg
        case .observation: return AppColors.warningFg
        case .quarantine: return AppColors.errorFg
        }
    }
}

// MARK: - Add Vaccine Sheet

private struct AddVaccineSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.modelContext) private var modelContext

    let bovine: Bovine

    @State private var vaccineName = ""
    @State private var dose = ""
    @State private var batch = ""
    @State private var date = Date()
    @State private var hasNextDose = false
    @State private var nextDose = Date().addingTimeInterval(86400 * 30)

    var canSave: Bool {
        !vaccineName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !dose.trimmingCharacters(in: .whitespaces).isEmpty &&
        !batch.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Datos de la vacuna") {
                    TextField("Nombre", text: $vaccineName)
                    TextField("Dosis", text: $dose)
                    TextField("Lote", text: $batch)
                    DatePicker("Fecha", selection: $date, displayedComponents: .date)
                }

                Section {
                    Toggle("Siguiente dosis", isOn: $hasNextDose)
                    if hasNextDose {
                        DatePicker("Fecha próxima dosis", selection: $nextDose, displayedComponents: .date)
                    }
                }
            }
            .navigationTitle("Nueva Vacuna")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancelar") { dismiss() }
                        .foregroundColor(.secondary)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Guardar") { save() }
                        .bold()
                        .foregroundColor(canSave ? AppColors.primary : .gray)
                        .disabled(!canSave)
                }
            }
        }
    }

    private func save() {
        let vaccine = Vaccine(
            name: vaccineName.trimmingCharacters(in: .whitespaces),
            dose: dose.trimmingCharacters(in: .whitespaces),
            date: date,
            batch: batch.trimmingCharacters(in: .whitespaces),
            nextDose: hasNextDose ? nextDose : nil
        )
        vaccine.bovine = bovine
        bovine.vaccines.append(vaccine)
        modelContext.insert(vaccine)
        dismiss()
    }
}
