import SwiftUI

@main
struct TesseroneWatchApp: App {
    @StateObject private var connectivity = WatchConnectivityCoordinator()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivity)
        }
    }
}
