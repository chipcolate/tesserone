import AppIntents
import SwiftUI
import TesseroneKit
import WidgetKit

struct SingleCardEntry: TimelineEntry {
    let date: Date
    let card: WatchSnapshotCard?
}

struct SingleCardProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SingleCardEntry {
        SingleCardEntry(date: Date(), card: SharedStore.cards().first)
    }

    func snapshot(for configuration: SelectCardIntent, in context: Context) async -> SingleCardEntry {
        SingleCardEntry(date: Date(), card: resolve(configuration))
    }

    func timeline(for configuration: SelectCardIntent, in context: Context) async -> Timeline<SingleCardEntry> {
        let entry = SingleCardEntry(date: Date(), card: resolve(configuration))
        return Timeline(entries: [entry], policy: .never)
    }

    private func resolve(_ configuration: SelectCardIntent) -> WatchSnapshotCard? {
        if let id = configuration.card?.id, let card = SharedStore.card(id: id) {
            return card
        }
        return SharedStore.cards().first
    }
}

struct SingleCardWidgetView: View {
    let entry: SingleCardEntry
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        if let card = entry.card {
            let bg = Color(hex: card.color) ?? .gray
            CardLogoContent(card: card, bg: bg, initialSize: 34)
                .padding(16)
                .widgetURL(SharedStore.openURL(for: card))
                .containerBackground(bg, for: .widget)
        } else {
            EmptyWidgetView()
                .containerBackground(Color.widgetBackground(scheme), for: .widget)
        }
    }
}

struct SingleCardWidget: Widget {
    let kind = "TesseroneSingleCard"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectCardIntent.self,
            provider: SingleCardProvider()
        ) { entry in
            SingleCardWidgetView(entry: entry)
        }
        .configurationDisplayName("Card")
        .description("Open a loyalty card straight from your home screen.")
        .supportedFamilies([.systemSmall])
    }
}
