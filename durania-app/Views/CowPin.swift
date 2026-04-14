import SwiftUI

struct CowPin: View {
    let cow: CowLocation
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "mappin.circle.fill")
                .font(isSelected ? .title2 : .title3)
                .foregroundColor(cow.status == .moving ? AppColors.successFg : AppColors.errorFg)

            if isSelected {
                Text(cow.name)
                    .font(.caption2)
                    .bold()
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.white)
                    .cornerRadius(6)
            }
        }
    }
}
