import SwiftUI
import SwiftData

struct AddCattleView: View {

    @Environment(\.dismiss) var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var earTag = ""
    @State private var name = ""
    @State private var age = ""
    @State private var breed = ""
    @State private var sex = "Hembra"
    @State private var weight = ""
    @State private var ranch = "Rancho El Roble"
    @State private var healthStatus: HealthStatus = .healthy
    @State private var showValidationError = false

    let sexes = ["Macho", "Hembra"]

    var isFormValid: Bool {
        !earTag.trimmingCharacters(in: .whitespaces).isEmpty &&
        !breed.trimmingCharacters(in: .whitespaces).isEmpty &&
        Int(age) != nil &&
        Double(weight) != nil
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Identificación") {
                    TextField("Arete (ej. MX-20398)", text: $earTag)
                        .autocapitalization(.allCharacters)
                    TextField("Nombre (opcional)", text: $name)
                }

                Section("Datos generales") {
                    TextField("Raza", text: $breed)

                    Picker("Sexo", selection: $sex) {
                        ForEach(sexes, id: \.self) { Text($0) }
                    }

                    TextField("Edad (años)", text: $age)
                        .keyboardType(.numberPad)

                    TextField("Peso (kg)", text: $weight)
                        .keyboardType(.decimalPad)
                }

                Section("Rancho") {
                    TextField("Rancho", text: $ranch)
                }

                Section("Estado sanitario") {
                    Picker("Estado", selection: $healthStatus) {
                        ForEach(HealthStatus.allCases, id: \.self) { status in
                            Text(status.rawValue).tag(status)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle("Nuevo Bovino")
            .alert("Campos requeridos", isPresented: $showValidationError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Completa arete, raza, edad y peso para continuar.")
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancelar") { dismiss() }
                        .foregroundColor(AppColors.errorFg)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Guardar") { save() }
                        .foregroundColor(AppColors.tealGreen)
                        .bold()
                }
            }
        }
    }

    // MARK: - Save

    private func save() {
        guard isFormValid else {
            showValidationError = true
            return
        }

        let bovine = Bovine(
            earTag: earTag.trimmingCharacters(in: .whitespaces).uppercased(),
            name: name.trimmingCharacters(in: .whitespaces).isEmpty ? nil : name.trimmingCharacters(in: .whitespaces),
            age: Int(age) ?? 0,
            breed: breed.trimmingCharacters(in: .whitespaces),
            sex: sex,
            weight: Double(weight) ?? 0,
            healthStatus: healthStatus,
            ranch: ranch.trimmingCharacters(in: .whitespaces)
        )

        modelContext.insert(bovine)
        dismiss()
    }
}

#Preview {
    AddCattleView()
        .modelContainer(for: Bovine.self, inMemory: true)
}
