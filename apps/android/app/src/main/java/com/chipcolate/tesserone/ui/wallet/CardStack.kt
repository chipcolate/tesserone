package com.chipcolate.tesserone.ui.wallet

import android.os.Build
import android.os.SystemClock
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.key
import androidx.compose.runtime.withFrameNanos
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.motion.rubberBand
import com.chipcolate.tesserone.core.motion.stackContentHeight
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.isLightColor
import com.chipcolate.tesserone.ui.theme.parseHexColor
import com.chipcolate.tesserone.ui.theme.textOnColor
import java.io.File
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

enum class HapticKind { Light, Medium }

@Stable
class CardStackController(
    private val scope: CoroutineScope,
) {
    val selection = Animatable(0f)
    val flip = Animatable(0f)

    var scrollOffset by mutableFloatStateOf(0f)
        private set
    var dismissY by mutableFloatStateOf(0f)
        private set
    var selectedIndex by mutableIntStateOf(-1)
        private set
    var expandedIndex by mutableIntStateOf(-1)
        private set
    var draggedIndex by mutableIntStateOf(-1)
        private set
    var dragTranslateY by mutableFloatStateOf(0f)
        private set
    var dragStartY by mutableFloatStateOf(0f)
        private set
    var viewportHeight by mutableFloatStateOf(0f)
        private set
    var cardCount by mutableIntStateOf(0)
    var reorderMode = false

    var onHaptic: (HapticKind) -> Unit = {}
    var onMaxBrightness: () -> Unit = {}
    var onRestoreBrightness: () -> Unit = {}
    var onEdit: (Int) -> Unit = {}
    var onReorder: (Int, Int) -> Unit = { _, _ -> }

    var stackSpacingPx = 0f
    var cardHeightPx = 0f
    var miniPeekPx = 0f
    var expandedTopPx = 0f
    var gap10Px = 0f
    var dismissDistancePx = 0f
    var dismissVelocityPx = 0f
    var rubberBandFactor = CardStackDp.RUBBER_BAND_FACTOR

    private var savedOffset = 0f
    private var savedDismissY = 0f
    private var scrollJob: Job? = null
    private var dismissJob: Job? = null

    val maxScroll: Float
        get() = (stackContentHeight(cardCount, stackSpacingPx, cardHeightPx) - viewportHeight)
            .coerceAtLeast(0f)

    fun onViewport(heightPx: Float, n: Int) {
        viewportHeight = heightPx
        cardCount = n
        val max = maxScroll
        if (scrollOffset > max) scrollOffset = max
    }

    fun cancelScrollAnim() {
        scrollJob?.cancel()
        scrollJob = null
    }

    fun beginPan() {
        cancelScrollAnim()
        dismissJob?.cancel()
        savedOffset = scrollOffset
        savedDismissY = dismissY
    }

    fun updatePan(translationY: Float) {
        if (selectedIndex < 0) {
            val raw = savedOffset - translationY
            val max = maxScroll
            scrollOffset = when {
                raw < 0f -> rubberBand(raw, 0f, rubberBandFactor)
                raw > max -> rubberBand(raw, max, rubberBandFactor)
                else -> raw
            }
        } else {
            dismissY = (savedDismissY + translationY).coerceAtMost(0f)
        }
    }

    fun endPan(velocityY: Float) {
        if (selectedIndex < 0) {
            val max = maxScroll
            val v = scrollOffset
            scrollJob = scope.launch {
                when {
                    v < 0f -> {
                        onHaptic(HapticKind.Light)
                        springFloat(scrollOffset, 0f, SpringBounce) { scrollOffset = it }
                    }
                    v > max -> {
                        onHaptic(HapticKind.Light)
                        springFloat(scrollOffset, max, SpringBounce) { scrollOffset = it }
                    }
                    else -> decayScroll(-velocityY, 0f, max)
                }
            }
        } else {
            if (dismissY < -dismissDistancePx || velocityY < -dismissVelocityPx) {
                dismiss(haptic = false)
            } else {
                dismissJob = scope.launch {
                    springFloat(dismissY, 0f, SpringSelect) { dismissY = it }
                }
            }
        }
    }

    fun tap(index: Int?) {
        if (reorderMode) return
        if (index == null) return
        if (selectedIndex < 0) {
            selectCardByIndex(index)
        } else if (selectedIndex == index) {
            dismiss(haptic = true)
        }
    }

    fun selectCardByIndex(index: Int): Boolean {
        if (index < 0) return true
        if (reorderMode) return true
        val already = selectedIndex == index
        expandedIndex = index
        selectedIndex = index
        scope.launch { flip.animateTo(Math.PI.toFloat(), FlipSpec) }
        scope.launch { selection.animateTo(1f, SpringSelect) }
        if (!already) {
            onHaptic(HapticKind.Medium)
            onMaxBrightness()
        }
        return viewportHeight > 0f
    }

    fun dismiss(haptic: Boolean) {
        if (selectedIndex < 0 && selection.value == 0f) return
        selectedIndex = -1
        if (haptic) onHaptic(HapticKind.Medium)
        onRestoreBrightness()
        scope.launch { flip.animateTo(0f, FlipSpec) }
        dismissJob?.cancel()
        dismissJob = scope.launch {
            springFloat(dismissY, 0f, SpringDismiss) { dismissY = it }
        }
        scope.launch {
            selection.animateTo(0f, SpringIdle)
            expandedIndex = -1
        }
    }

    fun editCard(index: Int) {
        if (reorderMode) return
        if (selectedIndex < 0) return
        onHaptic(HapticKind.Medium)
        dismiss(haptic = false)
        onEdit(index)
    }

    fun startReorderDrag(index: Int) {
        if (!reorderMode) return
        draggedIndex = index
        dragTranslateY = 0f
        dragStartY = index * stackSpacingPx - scrollOffset
        onHaptic(HapticKind.Medium)
    }

    fun updateReorderDrag(translationY: Float) {
        if (draggedIndex < 0) return
        dragTranslateY = translationY
    }

    fun endReorderDrag() {
        val from = draggedIndex
        if (from < 0) return
        val currentY = dragStartY + dragTranslateY
        val targetIndex = ((currentY + scrollOffset).coerceAtLeast(0f) / stackSpacingPx)
            .roundToInt()
        draggedIndex = -1
        dragTranslateY = 0f
        if (targetIndex != from) {
            onReorder(from, targetIndex)
            onHaptic(HapticKind.Light)
        }
    }

    fun slotIndex(index: Int, total: Int): Int {
        val dragIdx = draggedIndex
        if (dragIdx < 0 || dragIdx == index) return index
        val dragCurrentY = dragStartY + dragTranslateY + scrollOffset
        val dragCurrentSlot = (dragCurrentY / stackSpacingPx).roundToInt()
        val clampedSlot = dragCurrentSlot.coerceIn(0, (total - 1).coerceAtLeast(0))
        return when {
            index > dragIdx && index <= clampedSlot -> index - 1
            index < dragIdx && index >= clampedSlot -> index + 1
            else -> index
        }
    }

    fun targetY(index: Int, total: Int): Float {
        if (draggedIndex == index) return dragStartY + dragTranslateY
        if (draggedIndex >= 0) {
            return slotIndex(index, total) * stackSpacingPx - scrollOffset
        }
        val stackY = index * stackSpacingPx - scrollOffset
        val selected = expandedIndex
        val sel = selection.value
        if (sel <= 0f || selected < 0) return stackY
        val other = if (selected == index) {
            expandedTopPx + dismissY
        } else {
            miniY(index, selected, total)
        }
        return lerp(stackY, other, sel)
    }

    fun targetHeight(index: Int, total: Int): Float {
        val selected = expandedIndex
        val sel = selection.value
        if (sel <= 0f || selected != index || viewportHeight <= 0f) return cardHeightPx
        val miniStackHeight = minOf((total - 1) * miniPeekPx, viewportHeight * 0.2f)
        val expanded = viewportHeight - expandedTopPx - miniStackHeight - gap10Px
        return lerp(cardHeightPx, expanded.coerceAtLeast(cardHeightPx * 0.5f), sel)
    }

    fun zIndex(index: Int): Float {
        if (draggedIndex == index) return 999f
        if (expandedIndex == index && selection.value > 0f) return 1000f
        if (expandedIndex >= 0 && selection.value > 0f) {
            return if (index < expandedIndex) index.toFloat() else (index - 1).toFloat()
        }
        return index.toFloat()
    }

    fun flipFor(index: Int): Float =
        if (expandedIndex == index) flip.value else 0f

    private fun miniY(index: Int, selected: Int, total: Int): Float {
        val miniIndex = if (index < selected) index else index - 1
        val numMiniCards = total - 1
        val miniStackBottom = viewportHeight - gap10Px
        return miniStackBottom - (numMiniCards - miniIndex) * miniPeekPx
    }

    private fun lerp(a: Float, b: Float, t: Float): Float = a + (b - a) * t

    private suspend fun springFloat(
        from: Float,
        target: Float,
        spec: AnimationSpec<Float>,
        apply: (Float) -> Unit,
    ) {
        val anim = Animatable(from)
        anim.animateTo(target, spec) { apply(value) }
    }

    private suspend fun decayScroll(velocityPxPerSec: Float, min: Float, max: Float) {
        val deceleration = CardStackDp.DECELERATION
        var current = scrollOffset
        if (current < min) {
            scrollOffset = min
            return
        }
        if (current > max) {
            scrollOffset = max
            return
        }
        if (abs(velocityPxPerSec) < 1f) return
        var velocityMs = velocityPxPerSec / 1000.0
        var lastFrame = 0L
        while (true) {
            val frame = withFrameNanos { it }
            if (lastFrame == 0L) {
                lastFrame = frame
                continue
            }
            val dtMs = ((frame - lastFrame) / 1_000_000.0).coerceAtMost(64.0)
            lastFrame = frame
            val kv = deceleration.toDouble().pow(dtMs)
            val next = current + (velocityMs * deceleration * (1.0 - kv) / (1.0 - deceleration)).toFloat()
            velocityMs *= kv
            when {
                next < min -> {
                    scrollOffset = min
                    return
                }
                next > max -> {
                    scrollOffset = max
                    return
                }
                else -> {
                    current = next
                    scrollOffset = current
                }
            }
            if (abs(velocityMs * 1000.0) < 1.0) return
        }
    }
}

@Composable
fun CardStack(
    cards: List<FidelityCard>,
    brands: BrandIndex,
    filesDir: File,
    reorderMode: Boolean,
    onReorder: (Int, Int) -> Unit,
    onEdit: (FidelityCard) -> Unit,
    onMaxBrightness: () -> Unit,
    onRestoreBrightness: () -> Unit,
    onControllerReady: (CardStackController) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    val view = LocalView.current
    val density = LocalDensity.current
    val controller = remember { CardStackController(scope) }

    SideEffect {
        controller.reorderMode = reorderMode
        controller.cardCount = cards.size
        controller.onHaptic = { view.performWalletHaptic(it) }
        controller.onMaxBrightness = onMaxBrightness
        controller.onRestoreBrightness = onRestoreBrightness
        controller.onEdit = { idx -> cards.getOrNull(idx)?.let(onEdit) }
        controller.onReorder = onReorder
        with(density) {
            controller.stackSpacingPx = CardStackDp.STACK_SPACING.dp.toPx()
            controller.cardHeightPx = CardStackDp.CARD_HEIGHT.dp.toPx()
            controller.miniPeekPx = CardStackDp.MINI_PEEK.dp.toPx()
            controller.expandedTopPx = CardStackDp.EXPANDED_TOP.dp.toPx()
            controller.gap10Px = CardStackDp.GAP.dp.toPx()
            controller.dismissDistancePx = CardStackDp.DISMISS_DISTANCE.dp.toPx()
            controller.dismissVelocityPx = CardStackDp.DISMISS_VELOCITY.dp.toPx()
        }
    }

    LaunchedEffect(controller) { onControllerReady(controller) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .clipToBounds()
            .onSizeChanged { controller.onViewport(it.height.toFloat(), cards.size) }
            .pointerInput(controller) { detectWalletGestures(controller) },
    ) {
        cards.forEachIndexed { index, card ->
            key(card.id) {
                WalletCardItem(
                    card = card,
                    index = index,
                    total = cards.size,
                    controller = controller,
                    brands = brands,
                    filesDir = filesDir,
                    reorderMode = reorderMode,
                    onReorder = onReorder,
                )
            }
        }
    }
}

@Composable
private fun WalletCardItem(
    card: FidelityCard,
    index: Int,
    total: Int,
    controller: CardStackController,
    brands: BrandIndex,
    filesDir: File,
    reorderMode: Boolean,
    onReorder: (Int, Int) -> Unit,
) {
    val density = LocalDensity.current
    val y = controller.targetY(index, total)
    val h = controller.targetHeight(index, total)
    val z = controller.zIndex(index)
    val flipRad = controller.flipFor(index)
    val isDragged = controller.draggedIndex == index
    val inSlotShift = controller.draggedIndex >= 0 && !isDragged
    val slotTarget = controller.slotIndex(index, total) * controller.stackSpacingPx -
        controller.scrollOffset
    val slotY by animateFloatAsState(
        targetValue = if (inSlotShift) slotTarget else y,
        animationSpec = if (inSlotShift) SpringReorder else tween(0),
        label = "slot-$index",
    )
    val drawY = when {
        isDragged -> y
        inSlotShift -> slotY
        else -> y
    }
    val scaleTarget = when {
        isDragged -> 1.05f
        reorderMode -> 1.02f
        else -> 1f
    }
    val scale by animateFloatAsState(
        targetValue = scaleTarget,
        animationSpec = if (reorderMode || isDragged) SpringReorder else SpringIdle,
        label = "scale-$index",
    )
    val armedAlpha by animateFloatAsState(
        targetValue = if (reorderMode) 1f else 0f,
        animationSpec = tween(150),
        label = "armed-$index",
    )
    val bgHex = brands.cardBackground(card.color, card.logoSlug)
    val fg = textOnColor(bgHex)
    val handleTint = if (isLightColor(bgHex)) {
        androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.35f)
    } else {
        androidx.compose.ui.graphics.Color.White.copy(alpha = 0.55f)
    }
    val frontOpacity = frontFaceOpacity(flipRad)
    val backOpacity = backFaceOpacity(flipRad)
    val frontDeg = Math.toDegrees(flipRad.toDouble()).toFloat()
    val backDeg = frontDeg + 180f
    val cam = density.density * 16f
    val heightDp = with(density) { h.toDp() }
    val radius = RoundedCornerShape(CardStackDp.CARD_RADIUS.dp)
    val showHandle = controller.expandedIndex == index && controller.selection.value > 0.01f

    Box(
        modifier = Modifier
            .zIndex(z)
            .offset { IntOffset(0, drawY.roundToInt()) }
            .fillMaxWidth()
            .height(heightDp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .shadow(6.dp, radius)
            .clip(radius),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    rotationY = frontDeg
                    cameraDistance = cam
                    alpha = frontOpacity
                },
        ) {
            CardFace(card = card, brands = brands, filesDir = filesDir)
        }
        if (controller.expandedIndex == index) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        rotationY = backDeg
                        cameraDistance = cam
                        alpha = backOpacity
                    },
            ) {
                CardBack(card = card, brands = brands)
            }
        }

        if (showHandle) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 8.dp)
                    .graphicsLayer {
                        rotationY = frontDeg
                        cameraDistance = cam
                        alpha = frontOpacity
                    },
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 36.dp, height = 5.dp)
                        .clip(RoundedCornerShape(2.5.dp))
                        .background(handleTint),
                )
            }
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 8.dp)
                    .graphicsLayer {
                        rotationY = backDeg
                        cameraDistance = cam
                        alpha = backOpacity
                    },
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 36.dp, height = 5.dp)
                        .clip(RoundedCornerShape(2.5.dp))
                        .background(androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.35f)),
                )
            }
        }

        if (armedAlpha > 0.01f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(2.dp, Accent.copy(alpha = armedAlpha), radius),
            )
        }

        if (reorderMode) {
            val atTop = index == 0
            val atBottom = index == total - 1
            Column(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ReorderButton(
                    label = "▲",
                    enabled = !atTop,
                    bg = fg,
                    fg = parseHexColor(bgHex),
                    onClick = { if (!atTop) onReorder(index, index - 1) },
                )
                ReorderButton(
                    label = "▼",
                    enabled = !atBottom,
                    bg = fg,
                    fg = parseHexColor(bgHex),
                    onClick = { if (!atBottom) onReorder(index, index + 1) },
                )
            }
        }
    }
}

@Composable
private fun ReorderButton(
    label: String,
    enabled: Boolean,
    bg: androidx.compose.ui.graphics.Color,
    fg: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(width = 40.dp, height = 34.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(bg.copy(alpha = if (enabled) 1f else 0.3f))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = fg,
            fontFamily = Mono.bold,
            fontSize = 16.sp,
        )
    }
}

private suspend fun androidx.compose.ui.input.pointer.PointerInputScope.detectWalletGestures(
    controller: CardStackController,
) {
    awaitEachGesture {
        val down = awaitFirstDown(requireUnconsumed = true)
        val start = down.position
        val startTime = down.uptimeMillis
        val hit = controller.hitTestY(start.y)
        val tracker = VelocityTracker()
        tracker.addPosition(down.uptimeMillis, down.position)
        controller.cancelScrollAnim()

        var panned = false
        var reorderDrag = false
        var longPressFired = false
        var panOriginY = start.y
        val slop = CardStackDp.PAN_SLOP.dp.toPx()
        val longPressAt = when {
            controller.reorderMode && controller.selectedIndex < 0 && hit != null ->
                startTime + CardStackDp.LONG_PRESS_REORDER_MS
            controller.selectedIndex >= 0 && hit != null ->
                startTime + CardStackDp.LONG_PRESS_EDIT_MS
            else -> Long.MAX_VALUE
        }

        while (true) {
            val remaining = (longPressAt - SystemClock.uptimeMillis()).coerceAtLeast(0L)
            val event = if (!panned && !reorderDrag && !longPressFired && longPressAt != Long.MAX_VALUE) {
                withTimeoutOrNull(remaining.coerceAtLeast(1L)) { awaitPointerEvent() }
            } else {
                awaitPointerEvent()
            }

            if (event == null) {
                longPressFired = true
                if (controller.reorderMode && hit != null && controller.selectedIndex < 0) {
                    reorderDrag = true
                    controller.startReorderDrag(hit)
                } else if (controller.selectedIndex >= 0 && hit != null) {
                    controller.editCard(hit)
                    while (true) {
                        val rest = awaitPointerEvent()
                        if (rest.changes.none { it.pressed }) break
                    }
                    return@awaitEachGesture
                }
                continue
            }

            val change = event.changes.firstOrNull { it.id == down.id } ?: event.changes.first()
            tracker.addPosition(change.uptimeMillis, change.position)

            if (!change.pressed) {
                val velY = tracker.calculateVelocity().y
                when {
                    reorderDrag -> controller.endReorderDrag()
                    panned -> controller.endPan(velY)
                    !longPressFired -> controller.tap(hit)
                }
                break
            }

            val dy = change.position.y - start.y
            if (!panned && !reorderDrag && abs(dy) > slop) {
                panned = true
                panOriginY = change.position.y
                controller.beginPan()
            }
            if (reorderDrag) {
                controller.updateReorderDrag(change.position.y - start.y)
            } else if (panned) {
                controller.updatePan(change.position.y - panOriginY)
            }
            change.consume()
        }
    }
}

private fun CardStackController.hitTestY(y: Float): Int? {
    val total = cardCount
    if (total <= 0) return null
    val order = (0 until total).sortedByDescending { zIndex(it) }
    for (i in order) {
        val top = targetY(i, total)
        val h = targetHeight(i, total)
        if (y >= top && y <= top + h) return i
    }
    return null
}

private fun View.performWalletHaptic(kind: HapticKind) {
    val constant = when (kind) {
        HapticKind.Light -> HapticFeedbackConstants.CLOCK_TICK
        HapticKind.Medium -> if (Build.VERSION.SDK_INT >= 30) {
            HapticFeedbackConstants.CONFIRM
        } else {
            HapticFeedbackConstants.KEYBOARD_TAP
        }
    }
    performHapticFeedback(constant)
}
