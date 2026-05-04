import SwiftUI

struct CardListView: View {
    @EnvironmentObject private var snapshotStore: SnapshotStore

    var body: some View {
        List(snapshotStore.sortedCards) { card in
            NavigationLink(value: card) {
                CardRowView(card: card)
            }
        }
        .navigationTitle("Tesserone")
        .navigationDestination(for: WatchSnapshotCard.self) { card in
            BarcodeView(card: card)
        }
    }
}
