import SwiftUI

struct RootView: View {
    @State private var showSplash = true
    @State private var splashOpacity: Double = 1

    var body: some View {
        ZStack {
            MainTabView()

            if showSplash {
                SplashView()
                    .opacity(splashOpacity)
                    .zIndex(1)
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                withAnimation(.easeInOut(duration: 0.7)) {
                    splashOpacity = 0
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                    showSplash = false
                }
            }
        }
    }
}
