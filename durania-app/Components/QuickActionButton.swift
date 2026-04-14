import SwiftUI

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    var action: () -> Void = {}

    var body: some View {
        Button {
            action()
        } label: {
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                
                Text(title)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity, minHeight: 90)
            .foregroundColor(.white)
            .background(color)
            .cornerRadius(18)
        }
    }
}

#Preview {
    QuickActionButton(
        title: "Escanear",
        icon: "dot.radiowaves.left.and.right",
        color: AppColors.primary
    )
}
