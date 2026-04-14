import SwiftUI

struct AppColors {
    // MARK: - Brand
    static let primary    = Color(hex: "065758")  // dark teal
    static let secondary  = Color(hex: "82c3c4")  // medium teal
    static let tertiary   = Color(hex: "bdc6a4")  // sage
    static let accent     = Color(hex: "c4b760")  // gold
    static let soft       = Color(hex: "a9d4d6")  // pale blue-green
    static let background = Color(hex: "f9fafc")
    static let surface    = Color(hex: "fefeff")
    static let text       = Color(hex: "1a222f")

    // MARK: - Status foreground
    static let successFg = Color(hex: "4ec4a0")
    static let warningFg = Color(hex: "e8741b")
    static let infoFg    = Color(hex: "3f7fee")
    static let errorFg   = Color(hex: "d14344")

    // MARK: - Status background
    static let successBg = Color(hex: "f0fdf4")
    static let warningBg = Color(hex: "fdedd5")
    static let infoBg    = Color(hex: "daeaff")
    static let errorBg   = Color(hex: "fee2e1")

    // MARK: - Legacy aliases
    static var tealGreen:   Color { secondary }
    static var forestGreen: Color { primary   }
    static var lint:        Color { tertiary  }
}

private extension Color {
    init(hex: String) {
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   Double((int >> 16) & 0xFF) / 255,
            green: Double((int >> 8)  & 0xFF) / 255,
            blue:  Double( int        & 0xFF) / 255
        )
    }
}
