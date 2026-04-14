import SwiftUI

struct ProfileView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    
                    // MARK: - Header
                    
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [AppColors.tealGreen, AppColors.forestGreen],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 120, height: 120)
                            
                            Image(systemName: "person.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.white)
                        }
                        
                        Text("Juan Pérez")
                            .font(.title2.bold())
                        
                        Text("Productor Ganadero")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.top, 20)
                    
                    // MARK: - Info Card
                    
                    VStack(spacing: 14) {
                        ProfileRow(icon: "envelope.fill", title: "Correo", value: "juan@email.com")
                        Divider()
                        ProfileRow(icon: "house.fill", title: "Rancho", value: "Rancho El Roble")
                        Divider()
                        ProfileRow(icon: "mappin.and.ellipse", title: "Estado", value: "Durango")
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(20)
                    
                    // MARK: - Actions
                    
                    VStack(spacing: 14) {
                        actionButton(
                            title: "Editar Perfil",
                            icon: "pencil",
                            color: AppColors.tealGreen
                        )
                        
                        actionButton(
                            title: "Configuración",
                            icon: "gear",
                            color: AppColors.forestGreen
                        )
                    }
                    
                    // MARK: - Logout
                    
                    Button(role: .destructive) {
                        print("Cerrar sesión")
                    } label: {
                        HStack {
                            Image(systemName: "arrow.backward.square")
                            Text("Cerrar sesión")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity, minHeight: 52)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppColors.errorFg)
                    .padding(.top, 10)
                    
                }
                .padding()
            }
            .navigationTitle("Perfil")
        }
    }
    
    // MARK: - Components
    
    func actionButton(
        title: String,
        icon: String,
        color: Color
    ) -> some View {
        Button {
            print(title)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                    .frame(width: 32)
                
                Text(title)
                    .font(.headline)
                    .foregroundColor(.black)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.gray.opacity(0.6))
            }
            .padding()
            .frame(maxWidth: .infinity, minHeight: 60)
            .background(Color(.systemGray6))
            .cornerRadius(18)
        }
        .buttonStyle(.plain)
    }
}

struct ProfileRow: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(AppColors.tealGreen)
                .frame(width: 26)
            
            Text(title)
                .foregroundColor(.gray)
            
            Spacer()
            
            Text(value)
                .bold()
        }
    }
}

#Preview {
    ProfileView()
}
