import WidgetKit
import SwiftUI
import AppIntents

struct CardListEntry: TimelineEntry {
    let date: Date
    let cards: [WidgetCard]
}

struct CardListProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> CardListEntry {
        CardListEntry(date: Date(), cards: Array(SharedStore.cards().prefix(8)))
    }

    func snapshot(for configuration: SelectCardsIntent, in context: Context) async -> CardListEntry {
        CardListEntry(date: Date(), cards: resolve(configuration))
    }

    func timeline(for configuration: SelectCardsIntent, in context: Context) async -> Timeline<CardListEntry> {
        let entry = CardListEntry(date: Date(), cards: resolve(configuration))
        return Timeline(entries: [entry], policy: .never)
    }

    /// Use the configured cards (in the chosen order), falling back to the first
    /// several cards when the widget hasn't been configured yet.
    private func resolve(_ configuration: SelectCardsIntent) -> [WidgetCard] {
        let all = SharedStore.cards()
        guard let chosen = configuration.cards, !chosen.isEmpty else {
            return Array(all.prefix(12))
        }
        return chosen.compactMap { sel in all.first { $0.id == sel.id } }
    }
}

struct CardListWidgetView: View {
    let entry: CardListEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Group {
            if entry.cards.isEmpty {
                EmptyWidgetView()
            } else {
                let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: columnCount)
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(entry.cards.prefix(maxCount)) { card in
                        CardTile(card: card)
                            .aspectRatio(1, contentMode: .fit)
                    }
                }
            }
        }
        .containerBackground(Color.widgetBackground(scheme), for: .widget)
    }

    // 2×2 fits a 2-column grid; the wider families use 4 columns.
    private var columnCount: Int {
        family == .systemSmall ? 2 : 4
    }

    private var maxCount: Int {
        switch family {
        case .systemSmall: return 4
        case .systemLarge: return 16
        default: return 8
        }
    }
}

struct CardListWidget: Widget {
    let kind = "TesseroneCardList"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectCardsIntent.self,
            provider: CardListProvider()
        ) { entry in
            CardListWidgetView(entry: entry)
        }
        .configurationDisplayName("Cards")
        .description("Show a set of loyalty cards; tap one to open it.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
