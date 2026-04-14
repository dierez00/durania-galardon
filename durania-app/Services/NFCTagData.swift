import Foundation

enum ScanSource {
    case nfc
    case qr
    case ar
}

struct NFCTagData {
    let rawValue: String
    let source: ScanSource
    let scannedAt: Date
}
