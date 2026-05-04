import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var connectivity: WatchConnectivityCoordinator

    var body: some View {
        VStack(spacing: 8) {
            Text("Tesserone")
                .font(.headline)
            Text(connectivity.statusMessage)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchConnectivityCoordinator())
}
