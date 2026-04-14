import Foundation

struct CollarStreamEvent: Decodable {
    let collarId: String
    let data: CollarReading
}

struct CollarReading: Decodable {
    let lat: String
    let lon: String
    let spd: String
    let temp: String
    let activity: String
    let bat_percent: String
    let timestamp: String
    let collar_id: String
    let animal_id: String
}
