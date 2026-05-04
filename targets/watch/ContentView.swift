import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var snapshotStore: SnapshotStore

    var body: some View {
        NavigationStack {
            content
        }
    }

    @ViewBuilder
    private var content: some View {
        if snapshotStore.snapshot == nil {
            SyncingView()
        } else if snapshotStore.sortedCards.isEmpty {
            NoCardsView()
        } else {
            CardListView()
        }
    }
}

private struct SyncingView: View {
    var body: some View {
        VStack(spacing: 8) {
            ProgressView()
            Text("Syncing")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

private struct NoCardsView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "creditcard")
                .font(.title2)
                .foregroundStyle(.secondary)
            Text("No cards yet")
                .font(.caption)
            Text("Add a card on iPhone")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    ContentView()
        .environmentObject(SnapshotStore())
        .environmentObject(LogoCache())
}
