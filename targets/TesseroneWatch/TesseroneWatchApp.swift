import SwiftUI

@main
struct TesseroneWatchApp: App {
    @StateObject private var snapshotStore: SnapshotStore
    @StateObject private var logoCache: LogoCache
    @StateObject private var connectivity: WatchConnectivityCoordinator

    init() {
        let snap = SnapshotStore()
        let logos = LogoCache()
        _snapshotStore = StateObject(wrappedValue: snap)
        _logoCache = StateObject(wrappedValue: logos)
        _connectivity = StateObject(
            wrappedValue: WatchConnectivityCoordinator(
                snapshotStore: snap,
                logoCache: logos
            )
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(snapshotStore)
                .environmentObject(logoCache)
                .environmentObject(connectivity)
        }
    }
}
