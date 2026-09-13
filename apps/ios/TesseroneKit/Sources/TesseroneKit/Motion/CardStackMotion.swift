import Foundation

/// Port of `shared/motion/card-stack.json` plus the Expo wallet layout math.
public enum CardStackMotion {
    public static let stackSpacing: Double = 170
    public static let cardHeight: Double = 280
    public static let cardRadius: Double = 2
    public static let miniPeek: Double = 45
    public static let expandedTop: Double = 20
    public static let rubberBandFactor: Double = 0.18
    public static let dismissDistance: Double = 100
    public static let dismissVelocity: Double = 500
    public static let flipDuration: Double = 0.3
    public static let flipPerspective: Double = 1000
    public static let panActivation: Double = 10
    public static let editLongPress: Double = 0.4
    public static let reorderLongPress: Double = 0.3
    public static let decayDeceleration: Double = 0.998
    public static let decayVelocityEPS: Double = 1
    public static let reorderArmedScale: Double = 1.02
    public static let reorderDragScale: Double = 1.05

    public static let select = MotionSpring(damping: 33, stiffness: 260)
    public static let dismiss = MotionSpring(damping: 34, stiffness: 280)
    public static let bounce = MotionSpring(damping: 42, stiffness: 420)
    public static let reorder = MotionSpring(damping: 40, stiffness: 340)
    /// Unselected stack settle while idle (`CardItem` "stiff").
    public static let stiff = MotionSpring(damping: 80, stiffness: 1200)

    public static func rubberBand(_ offset: Double, limit: Double, factor: Double = rubberBandFactor) -> Double {
        limit + (offset - limit) * factor
    }

    public static func contentHeight(cardCount: Int) -> Double {
        if cardCount == 0 { return 0 }
        return Double(cardCount - 1) * stackSpacing + cardHeight
    }

    public static func maxScroll(cardCount: Int, viewportHeight: Double) -> Double {
        max(0, contentHeight(cardCount: cardCount) - viewportHeight)
    }

    public static func miniStackHeight(cardCount: Int, viewportHeight: Double) -> Double {
        guard cardCount > 1 else { return 0 }
        return min(Double(cardCount - 1) * miniPeek, viewportHeight * 0.2)
    }

    public static func expandedHeight(cardCount: Int, viewportHeight: Double) -> Double {
        viewportHeight - expandedTop - miniStackHeight(cardCount: cardCount, viewportHeight: viewportHeight) - 10
    }

    /// Front is visible until the 90° cutoff.
    public static func frontFaceOpacity(_ flipProgress: Double) -> Double {
        flipProgress < .pi / 2 ? 1 : 0
    }

    /// Back appears at the 90° cutoff.
    public static func backFaceOpacity(_ flipProgress: Double) -> Double {
        flipProgress > .pi / 2 ? 1 : 0
    }

    public static func easeOutCubic(_ t: Double) -> Double {
        let x = min(max(t, 0), 1)
        return 1 - pow(1 - x, 3)
    }
}

public struct MotionSpring: Equatable, Sendable {
    public var damping: Double
    public var stiffness: Double
    public var mass: Double

    public init(damping: Double, stiffness: Double, mass: Double = 1) {
        self.damping = damping
        self.stiffness = stiffness
        self.mass = mass
    }
}

public struct CardLayout: Equatable, Sendable {
    public var y: Double
    public var height: Double
    public var scale: Double
    public var zIndex: Double

    public init(y: Double, height: Double, scale: Double, zIndex: Double) {
        self.y = y
        self.height = height
        self.scale = scale
        self.zIndex = zIndex
    }
}

public struct CardStackLayoutState: Equatable, Sendable {
    public var viewportHeight: Double
    public var scrollOffset: Double
    public var selectedIndex: Int
    public var dismissTranslateY: Double
    public var reorderMode: Bool
    public var draggedIndex: Int
    public var dragStartY: Double
    public var dragTranslateY: Double
    public var total: Int

    public init(
        viewportHeight: Double,
        scrollOffset: Double,
        selectedIndex: Int,
        dismissTranslateY: Double,
        reorderMode: Bool,
        draggedIndex: Int,
        dragStartY: Double,
        dragTranslateY: Double,
        total: Int
    ) {
        self.viewportHeight = viewportHeight
        self.scrollOffset = scrollOffset
        self.selectedIndex = selectedIndex
        self.dismissTranslateY = dismissTranslateY
        self.reorderMode = reorderMode
        self.draggedIndex = draggedIndex
        self.dragStartY = dragStartY
        self.dragTranslateY = dragTranslateY
        self.total = total
    }
}

extension CardStackMotion {
    public static func layout(index: Int, state: CardStackLayoutState) -> CardLayout {
        let total = state.total
        let vh = state.viewportHeight

        if state.draggedIndex == index {
            return CardLayout(
                y: state.dragStartY + state.dragTranslateY,
                height: cardHeight,
                scale: reorderDragScale,
                zIndex: 999
            )
        }

        if state.draggedIndex != -1 {
            let dragIdx = state.draggedIndex
            let dragCurrentY = state.dragStartY + state.dragTranslateY + state.scrollOffset
            let dragCurrentSlot = Int((dragCurrentY / stackSpacing).rounded())
            let clampedSlot = max(0, min(total - 1, dragCurrentSlot))

            var adjustedIndex = index
            if index > dragIdx && index <= clampedSlot {
                adjustedIndex = index - 1
            } else if index < dragIdx && index >= clampedSlot {
                adjustedIndex = index + 1
            }

            return CardLayout(
                y: Double(adjustedIndex) * stackSpacing - state.scrollOffset,
                height: cardHeight,
                scale: reorderArmedScale,
                zIndex: Double(index)
            )
        }

        if state.selectedIndex == -1 {
            return CardLayout(
                y: Double(index) * stackSpacing - state.scrollOffset,
                height: cardHeight,
                scale: state.reorderMode ? reorderArmedScale : 1,
                zIndex: Double(index)
            )
        }

        if state.selectedIndex == index {
            return CardLayout(
                y: expandedTop + state.dismissTranslateY,
                height: expandedHeight(cardCount: total, viewportHeight: vh),
                scale: 1,
                zIndex: 1000
            )
        }

        let miniIndex = index < state.selectedIndex ? index : index - 1
        let numMiniCards = total - 1
        let miniStackBottom = vh - 10
        let miniY = miniStackBottom - Double(numMiniCards - miniIndex) * miniPeek
        return CardLayout(
            y: miniY,
            height: cardHeight,
            scale: 1,
            zIndex: Double(miniIndex)
        )
    }
}

/// Analytical mass-spring-damper step matching RN `withSpring` (mass=1).
public enum SpringIntegrator {
    public static func step(
        value: Double,
        target: Double,
        velocity: Double,
        dt: Double,
        spring: MotionSpring
    ) -> (value: Double, velocity: Double, settled: Bool) {
        let m = max(spring.mass, 0.0001)
        let k = spring.stiffness
        let c = spring.damping
        let x0 = value - target
        if abs(x0) < 0.05 && abs(velocity) < 0.5 {
            return (target, 0, true)
        }

        let omega0 = sqrt(k / m)
        let zeta = c / (2 * sqrt(k * m))
        let t = dt
        let v0 = velocity

        let newValue: Double
        let newVelocity: Double
        if zeta < 1 {
            let omega1 = omega0 * sqrt(1 - zeta * zeta)
            let envelope = exp(-zeta * omega0 * t)
            let sin1 = sin(omega1 * t)
            let cos1 = cos(omega1 * t)
            let frag = envelope * (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1)
            newValue = target + frag
            newVelocity = -zeta * omega0 * frag + envelope * (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1)
        } else {
            let envelope = exp(-omega0 * t)
            let frag = x0 + (v0 + omega0 * x0) * t
            newValue = target + envelope * frag
            newVelocity = envelope * (-omega0 * frag) + envelope * (v0 + omega0 * x0)
        }

        if abs(newValue - target) < 0.05 && abs(newVelocity) < 0.5 {
            return (target, 0, true)
        }
        return (newValue, newVelocity, false)
    }
}

/// UIScrollView-style inertia. `deceleration` is per millisecond (UIKit 0.998).
public enum DecayIntegrator {
    public static func step(
        value: Double,
        velocity: Double,
        dt: Double,
        clampMin: Double,
        clampMax: Double,
        deceleration: Double = CardStackMotion.decayDeceleration
    ) -> (value: Double, velocity: Double, settled: Bool) {
        let k = -log(deceleration) * 1000
        let v1 = velocity * exp(-k * dt)
        var x1 = value + velocity * (1 - exp(-k * dt)) / k
        if x1 < clampMin {
            return (clampMin, 0, true)
        }
        if x1 > clampMax {
            return (clampMax, 0, true)
        }
        if abs(v1) < CardStackMotion.decayVelocityEPS {
            return (x1, 0, true)
        }
        return (x1, v1, false)
    }
}
