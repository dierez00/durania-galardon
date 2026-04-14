import SwiftUI

struct SplashView: View {
    @State private var fillProgress: CGFloat = 0

    var body: some View {
        ZStack {
            AppColors.primary
                .ignoresSafeArea()

            VStack(spacing: 20) {
                // Vaca con efecto de llenado de abajo hacia arriba
                ZStack {
                    // Silueta fantasma
                    Image("8A")
                        .resizable()
                        .renderingMode(.template)
                        .foregroundStyle(.white.opacity(0.15))
                        .frame(width: 90, height: 90)

                    // Vaca llena — máscara que sube
                    Image("8A")
                        .resizable()
                        .renderingMode(.template)
                        .foregroundStyle(.white)
                        .frame(width: 90, height: 90)
                        .mask(
                            GeometryReader { geo in
                                VStack(spacing: 0) {
                                    Spacer(minLength: 0)
                                    Rectangle()
                                        .frame(height: geo.size.height * fillProgress)
                                }
                            }
                        )
                }

                VStack(spacing: 6) {
                    Text("Durania")
                        .font(.system(size: 36, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .tracking(2)

                    Text("Gestión de hato bovino")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(.white.opacity(0.55))
                        .tracking(1)
                }
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 2.5)) {
                    fillProgress = 1
                }
            }
        }
    }
}

#Preview {
    SplashView()
}
