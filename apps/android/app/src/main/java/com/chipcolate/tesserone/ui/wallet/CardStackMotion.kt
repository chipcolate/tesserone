package com.chipcolate.tesserone.ui.wallet

import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import kotlin.math.sqrt

/** dp values from `shared/motion/card-stack.json`. */
object CardStackDp {
    const val STACK_SPACING = 170f
    const val CARD_HEIGHT = 280f
    const val CARD_RADIUS = 2f
    const val MINI_PEEK = 45f
    const val EXPANDED_TOP = 20f
    const val GAP = 10f
    const val DISMISS_DISTANCE = 100f
    const val DISMISS_VELOCITY = 500f
    const val RUBBER_BAND_FACTOR = 0.18f
    const val FLIP_MS = 300
    const val DECELERATION = 0.998f
    const val PAN_SLOP = 10f
    const val LONG_PRESS_EDIT_MS = 400L
    const val LONG_PRESS_REORDER_MS = 300L
}

/** RN mass=1: ζ = damping / (2√k). */
private fun dampingRatio(damping: Float, stiffness: Float): Float =
    damping / (2f * sqrt(stiffness))

val SpringSelect = spring<Float>(
    dampingRatio = dampingRatio(33f, 260f),
    stiffness = 260f,
)
val SpringDismiss = spring<Float>(
    dampingRatio = dampingRatio(34f, 280f),
    stiffness = 280f,
)
val SpringBounce = spring<Float>(
    dampingRatio = dampingRatio(42f, 420f),
    stiffness = 420f,
)
val SpringReorder = spring<Float>(
    dampingRatio = dampingRatio(40f, 340f),
    stiffness = 340f,
)
val SpringIdle = spring<Float>(
    dampingRatio = dampingRatio(80f, 1200f),
    stiffness = 1200f,
)

val EaseOutCubic = Easing { t ->
    val inv = 1f - t
    1f - inv * inv * inv
}

val FlipSpec = tween<Float>(durationMillis = CardStackDp.FLIP_MS, easing = EaseOutCubic)

fun frontFaceOpacity(flipProgressRad: Float): Float {
    val halfPi = (Math.PI / 2.0).toFloat()
    return if (flipProgressRad < halfPi) 1f else 0f
}

fun backFaceOpacity(flipProgressRad: Float): Float {
    val halfPi = (Math.PI / 2.0).toFloat()
    return if (flipProgressRad >= halfPi) 1f else 0f
}
