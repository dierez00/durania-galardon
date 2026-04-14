import Foundation
import SwiftData

@Model
class Bovine {
    var id: UUID
    var earTag: String
    var name: String?
    var age: Int
    var breed: String
    var sex: String
    var weight: Double
    var healthStatus: HealthStatus
    var lastVaccine: Date?
    var ranch: String

    @Relationship(deleteRule: .cascade)
    var vaccines: [Vaccine] = []

    @Relationship(deleteRule: .cascade)
    var events: [HealthEvent] = []

    init(
        id: UUID = UUID(),
        earTag: String,
        name: String? = nil,
        age: Int,
        breed: String,
        sex: String,
        weight: Double,
        healthStatus: HealthStatus = .healthy,
        lastVaccine: Date? = nil,
        ranch: String
    ) {
        self.id = id
        self.earTag = earTag
        self.name = name
        self.age = age
        self.breed = breed
        self.sex = sex
        self.weight = weight
        self.healthStatus = healthStatus
        self.lastVaccine = lastVaccine
        self.ranch = ranch
    }
}

enum HealthStatus: String, CaseIterable, Codable {
    case healthy = "Sano"
    case observation = "Observación"
    case quarantine = "Cuarentena"
}
