import SwiftUI

struct HomeButton: View {

    let title: String
    let icon: String
    let destination: AnyView

    var body: some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 15) {

                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(AppColors.forestGreen)

                Text(title)
                    .font(.headline)
                    .foregroundColor(AppColors.forestGreen)

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(AppColors.forestGreen.opacity(0.6))

            }
            .padding()
            .background(AppColors.lint)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 6, x: 0, y: 4)
        }
    }
}
