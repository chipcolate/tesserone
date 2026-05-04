import SwiftUI

struct CardListView: View {
    @EnvironmentObject private var snapshotStore: SnapshotStore

    var body: some View {
        List(snapshotStore.sortedCards) { card in
            CardRowView(card: card)
        }
        .navigationTitle("Tesserone")
    }
}
