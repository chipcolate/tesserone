import WidgetKit
import SwiftUI
import AppIntents

struct SingleCardEntry: TimelineEntry {
    let date: Date
    let card: WidgetCard?
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
        // Static content; refreshed explicitly by the app via reloadAllTimelines().
        return Timeline(entries: [entry], policy: .never)
    }

    /// Use the configured card, falling back to the first card when a freshly
    /// added widget hasn't been configured yet (or the chosen card was deleted).
    private func resolve(_ configuration: SelectCardIntent) -> WidgetCard? {
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
