import Foundation
import SwiftData

@Model
class Vaccine {
    var id: UUID
    var name: String
    var dose: String
    var date: Date
    var batch: String
    var nextDose: Date?
    var bovine: Bovine?

    init(
        id: UUID = UUID(),
        name: String,
        dose: String,
        date: Date,
        batch: String,
        nextDose: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.dose = dose
        self.date = date
        self.batch = batch
        self.nextDose = nextDose
    }
}
