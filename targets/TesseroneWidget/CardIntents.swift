import AppIntents

/// A loyalty card surfaced to the system widget configuration picker.
struct CardEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(name: "Card")
    }

    static var defaultQuery = CardQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

/// Backs the picker with the cards the app has synced into the App Group.
struct CardQuery: EntityQuery {
    func entities(for identifiers: [CardEntity.ID]) async throws -> [CardEntity] {
        SharedStore.cards()
            .filter { identifiers.contains($0.id) }
            .map { CardEntity(id: $0.id, name: $0.name) }
    }

    func suggestedEntities() async throws -> [CardEntity] {
        SharedStore.cards().map { CardEntity(id: $0.id, name: $0.name) }
    }
}

/// Configuration for the single-card widget: pick one card to open.
struct SelectCardIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Select Card" }
    static var description: IntentDescription {
        IntentDescription("Choose which card this widget opens.")
    }

    @Parameter(title: "Card")
    var card: CardEntity?
}

/// Configuration for the list widget: pick which cards appear.
struct SelectCardsIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Select Cards" }
    static var description: IntentDescription {
        IntentDescription("Choose which cards this widget shows.")
    }

    @Parameter(title: "Cards")
    var cards: [CardEntity]?
}
