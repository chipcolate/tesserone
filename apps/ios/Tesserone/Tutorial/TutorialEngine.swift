import TesseroneKit

struct TutorialContext {
    var cardCount: Int
    var selectedCardIdx: Int
    var fabOpen: Bool
    var reorderMode: Bool
}

struct TutorialStepDef: Equatable {
    var id: TutorialStepId
    var title: String
    var message: String
    var target: Target
    var index: Int
    var total: Int

    enum Target: Equatable {
        case fab
        case reorderItem
        case none
    }
}

enum TutorialEngine {
    static let order: [TutorialStepId] = [
        .homeAddFirst,
        .homeTapExpand,
        .expandedTips,
        .homeScroll,
        .homeShareTip,
        .homeReorderHint,
        .reorderDrag,
    ]

    static func activeStep(ctx: TutorialContext, tutorial: TutorialState, t: (String) -> String) -> TutorialStepDef? {
        guard tutorial.enabled else { return nil }
        func seen(_ id: TutorialStepId) -> Bool { tutorial.seenSteps[id.rawValue] == true }
        func make(_ id: TutorialStepId) -> TutorialStepDef {
            TutorialStepDef(
                id: id,
                title: t(titleKey(id)),
                message: t(messageKey(id)),
                target: target(id),
                index: order.firstIndex(of: id) ?? 0,
                total: order.count
            )
        }

        if ctx.reorderMode && !seen(.reorderDrag) { return make(.reorderDrag) }
        if ctx.selectedCardIdx >= 0 && !seen(.expandedTips) { return make(.expandedTips) }
        if ctx.fabOpen && ctx.cardCount >= 2 && !seen(.homeReorderHint) { return make(.homeReorderHint) }

        let atRest = !ctx.reorderMode && !ctx.fabOpen && ctx.selectedCardIdx == -1
        if atRest {
            if ctx.cardCount == 0 && !seen(.homeAddFirst) { return make(.homeAddFirst) }
            if ctx.cardCount >= 1 && !seen(.homeTapExpand) { return make(.homeTapExpand) }
            if ctx.cardCount >= 2 && !seen(.homeScroll) { return make(.homeScroll) }
            if ctx.cardCount >= 1 && !seen(.homeShareTip) { return make(.homeShareTip) }
        }
        return nil
    }

    private static func target(_ id: TutorialStepId) -> TutorialStepDef.Target {
        switch id {
        case .homeAddFirst: return .fab
        case .homeReorderHint: return .reorderItem
        default: return .none
        }
    }

    private static func titleKey(_ id: TutorialStepId) -> String {
        switch id {
        case .homeAddFirst: return "tutorial.homeAddFirstTitle"
        case .homeTapExpand: return "tutorial.homeTapExpandTitle"
        case .expandedTips: return "tutorial.expandedTipsTitle"
        case .homeScroll: return "tutorial.homeScrollTitle"
        case .homeShareTip: return "tutorial.homeShareTipTitle"
        case .homeReorderHint: return "tutorial.homeReorderHintTitle"
        case .reorderDrag: return "tutorial.reorderDragTitle"
        }
    }

    private static func messageKey(_ id: TutorialStepId) -> String {
        switch id {
        case .homeAddFirst: return "tutorial.homeAddFirstMessage"
        case .homeTapExpand: return "tutorial.homeTapExpandMessage"
        case .expandedTips: return "tutorial.expandedTipsMessage"
        case .homeScroll: return "tutorial.homeScrollMessage"
        case .homeShareTip: return "tutorial.homeShareTipMessage"
        case .homeReorderHint: return "tutorial.homeReorderHintMessage"
        case .reorderDrag: return "tutorial.reorderDragMessage"
        }
    }
}
