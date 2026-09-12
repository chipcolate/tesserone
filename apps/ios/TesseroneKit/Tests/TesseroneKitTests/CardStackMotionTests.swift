import Foundation
import XCTest
@testable import TesseroneKit

final class CardStackMotionTests: XCTestCase {
    func testRubberBandScalesPastLimit() {
        XCTAssertEqual(CardStackMotion.rubberBand(-100, limit: 0, factor: 0.18), -18, accuracy: 1e-9)
        XCTAssertEqual(CardStackMotion.rubberBand(110, limit: 100, factor: 0.18), 101.8, accuracy: 1e-9)
        XCTAssertEqual(CardStackMotion.rubberBand(0, limit: 0, factor: 0.18), 0, accuracy: 1e-9)
    }

    func testContentHeightAndMaxScroll() {
        XCTAssertEqual(CardStackMotion.contentHeight(cardCount: 0), 0)
        XCTAssertEqual(CardStackMotion.contentHeight(cardCount: 1), 280)
        XCTAssertEqual(CardStackMotion.contentHeight(cardCount: 6), 5 * 170 + 280)
        XCTAssertEqual(CardStackMotion.maxScroll(cardCount: 6, viewportHeight: 800), 5 * 170 + 280 - 800)
        XCTAssertEqual(CardStackMotion.maxScroll(cardCount: 1, viewportHeight: 800), 0)
    }

    func testFlipOpacityHardCutoff() {
        XCTAssertEqual(CardStackMotion.frontFaceOpacity(0), 1)
        XCTAssertEqual(CardStackMotion.frontFaceOpacity(.pi / 2 - 0.01), 1)
        XCTAssertEqual(CardStackMotion.frontFaceOpacity(.pi / 2), 0)
        XCTAssertEqual(CardStackMotion.backFaceOpacity(.pi / 2), 0)
        XCTAssertEqual(CardStackMotion.backFaceOpacity(.pi / 2 + 0.01), 1)
        XCTAssertEqual(CardStackMotion.backFaceOpacity(.pi), 1)
    }

    func testCollapsedAndSelectedLayout() {
        let collapsed = CardStackLayoutState(
            viewportHeight: 800,
            scrollOffset: 40,
            selectedIndex: -1,
            dismissTranslateY: 0,
            reorderMode: false,
            draggedIndex: -1,
            dragStartY: 0,
            dragTranslateY: 0,
            total: 6
        )
        let card2 = CardStackMotion.layout(index: 2, state: collapsed)
        XCTAssertEqual(card2.y, 2 * 170 - 40, accuracy: 1e-9)
        XCTAssertEqual(card2.height, 280)
        XCTAssertEqual(card2.scale, 1)

        let selected = CardStackLayoutState(
            viewportHeight: 800,
            scrollOffset: 40,
            selectedIndex: 2,
            dismissTranslateY: -30,
            reorderMode: false,
            draggedIndex: -1,
            dragStartY: 0,
            dragTranslateY: 0,
            total: 6
        )
        let expanded = CardStackMotion.layout(index: 2, state: selected)
        XCTAssertEqual(expanded.y, 20 - 30, accuracy: 1e-9)
        XCTAssertEqual(expanded.zIndex, 1000)
        XCTAssertEqual(
            expanded.height,
            CardStackMotion.expandedHeight(cardCount: 6, viewportHeight: 800),
            accuracy: 1e-9
        )

        let mini = CardStackMotion.layout(index: 0, state: selected)
        let expectedMiniY = 800 - 10 - Double(5 - 0) * 45
        XCTAssertEqual(mini.y, expectedMiniY, accuracy: 1e-9)
    }

    func testSpringMovesTowardTarget() {
        let stepped = SpringIntegrator.step(
            value: 100,
            target: 0,
            velocity: 0,
            dt: 1.0 / 60.0,
            spring: CardStackMotion.select
        )
        XCTAssertLessThan(stepped.value, 100)
        XCTAssertGreaterThan(stepped.value, 0)
        XCTAssertFalse(stepped.settled)
    }

    func testDecayClampsAndSettles() {
        let hit = DecayIntegrator.step(
            value: 99,
            velocity: 400,
            dt: 1.0 / 60.0,
            clampMin: 0,
            clampMax: 100
        )
        XCTAssertEqual(hit.value, 100)
        XCTAssertTrue(hit.settled)

        let coast = DecayIntegrator.step(
            value: 20,
            velocity: 800,
            dt: 1.0 / 60.0,
            clampMin: 0,
            clampMax: 400
        )
        XCTAssertGreaterThan(coast.value, 20)
        XCTAssertLessThan(abs(coast.velocity), 800)
        XCTAssertFalse(coast.settled)
    }

    func testTextOnColorThreshold() {
        XCTAssertTrue(CardAppearance.isLightColor("#FFFFFF"))
        XCTAssertEqual(CardAppearance.textOnColor("#FFFFFF"), "#000000")
        XCTAssertFalse(CardAppearance.isLightColor("#000000"))
        XCTAssertEqual(CardAppearance.textOnColor("#000000"), "#FFFFFF")
        XCTAssertEqual(CardAppearance.resolveColor(cardColor: nil, brandPrimary: nil), "#333333")
        XCTAssertEqual(CardAppearance.resolveColor(cardColor: "#42A5F5", brandPrimary: "#000000"), "#42A5F5")
    }
}
