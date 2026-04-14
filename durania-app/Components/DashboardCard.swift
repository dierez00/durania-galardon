import SwiftUI

struct DashboardCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    var assetImage: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(color)
                        .frame(width: 36, height: 36)
                    if let asset = assetImage {
                        Image(asset)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 22, height: 22)
                            .foregroundColor(.white)
                    } else {
                        Image(systemName: icon)
                            .foregroundColor(.white)
                    }
                }

                Spacer()
            }
            
            Text(value)
                .font(.title)
                .bold()
            
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 110)
        .background(Color(.systemGray6))
        .cornerRadius(18)
    }
}

#Preview {
    DashboardCard(
        title: "Bovinos",
        value: "120",
        icon: "hare.fill",
        color: AppColors.primary
    )
}
