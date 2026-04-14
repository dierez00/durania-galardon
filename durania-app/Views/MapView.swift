import SwiftUI
import MapKit

struct MapView: View {
    let cows: [CowLocation]
    @Binding var selectedCowID: CowLocation.ID?

    @State private var position: MapCameraPosition

    init(cows: [CowLocation], selectedCowID: Binding<CowLocation.ID?>) {
        self.cows = cows
        self._selectedCowID = selectedCowID

        // Centrar el mapa en la vaca seleccionada inicialmente, sin disparar onChange
        let initialCow = selectedCowID.wrappedValue.flatMap { id in
            cows.first { $0.id == id }
        }
        if let cow = initialCow {
            self._position = State(initialValue: .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: cow.latitude, longitude: cow.longitude),
                span: MKCoordinateSpan(latitudeDelta: 0.006, longitudeDelta: 0.006)
            )))
        } else {
            self._position = State(initialValue: .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 24.0277, longitude: -104.6532),
                span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
            )))
        }
    }

    var body: some View {
        Map(position: $position) {
            ForEach(cows) { cow in
                Annotation(cow.name, coordinate: cow.coordinate, anchor: .bottom) {
                    MapPinView(cow: cow, isSelected: selectedCowID == cow.id)
                        .onTapGesture {
                            selectedCowID = cow.id
                        }
                }
                .annotationTitles(.hidden)
            }
        }
        .onChange(of: selectedCowID) { _, newID in
            guard let newID, let cow = cows.first(where: { $0.id == newID }) else { return }
            withAnimation(.easeInOut(duration: 0.22)) {
                position = .region(MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: cow.latitude, longitude: cow.longitude),
                    span: MKCoordinateSpan(latitudeDelta: 0.006, longitudeDelta: 0.006)
                ))
            }
        }
        .cornerRadius(16)
    }
}

// Vista del pin extraida como struct Equatable para evitar re-renders innecesarios
private struct MapPinView: View, Equatable {
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
                    .lineLimit(1)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.92))
                    .cornerRadius(8)
            }
        }
    }

    static func == (lhs: MapPinView, rhs: MapPinView) -> Bool {
        lhs.cow.id == rhs.cow.id && lhs.isSelected == rhs.isSelected
    }
}
