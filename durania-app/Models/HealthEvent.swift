import Foundation
import SwiftData

@Model
class HealthEvent {
    var id: UUID
    var title: String
    var details: String
    var date: Date
    var bovine: Bovine?

    init(
        id: UUID = UUID(),
        title: String,
        description: String,
        date: Date
    ) {
        self.id = id
        self.title = title
        self.details = description
        self.date = date
    }
}
