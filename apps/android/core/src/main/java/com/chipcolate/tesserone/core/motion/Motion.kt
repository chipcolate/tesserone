package com.chipcolate.tesserone.core.motion

/** Overscroll: `limit + (offset - limit) * factor`. Matches Expo `rubberBand`. */
fun rubberBand(offset: Float, limit: Float, factor: Float): Float =
    limit + (offset - limit) * factor

fun stackContentHeight(numCards: Int, stackSpacing: Float, cardHeight: Float): Float {
    if (numCards <= 0) return 0f
    return (numCards - 1) * stackSpacing + cardHeight
}
