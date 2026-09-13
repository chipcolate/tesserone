package com.chipcolate.tesserone.ui.tutorial

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.chipcolate.tesserone.core.i18n.Strings
import com.chipcolate.tesserone.core.model.TutorialStepId
import com.chipcolate.tesserone.ui.components.ButtonVariant
import com.chipcolate.tesserone.ui.components.TesseroneButton
import com.chipcolate.tesserone.ui.i18n.t
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.wallet.EaseOutCubic

data class TutorialStepDef(
    val id: String,
    val title: String,
    val message: String,
    val target: String?,
    val index: Int,
    val total: Int,
)

private val STEP_TARGETS = mapOf(
    TutorialStepId.HOME_ADD_FIRST to "fab",
    TutorialStepId.HOME_TAP_EXPAND to null,
    TutorialStepId.EXPANDED_TIPS to null,
    TutorialStepId.HOME_SCROLL to null,
    TutorialStepId.HOME_SHARE_TIP to null,
    TutorialStepId.HOME_REORDER_HINT to "reorderItem",
    TutorialStepId.REORDER_DRAG to null,
)

private val STEP_KEYS = mapOf(
    TutorialStepId.HOME_ADD_FIRST to ("tutorial.homeAddFirstTitle" to "tutorial.homeAddFirstMessage"),
    TutorialStepId.HOME_TAP_EXPAND to ("tutorial.homeTapExpandTitle" to "tutorial.homeTapExpandMessage"),
    TutorialStepId.EXPANDED_TIPS to ("tutorial.expandedTipsTitle" to "tutorial.expandedTipsMessage"),
    TutorialStepId.HOME_SCROLL to ("tutorial.homeScrollTitle" to "tutorial.homeScrollMessage"),
    TutorialStepId.HOME_SHARE_TIP to ("tutorial.homeShareTipTitle" to "tutorial.homeShareTipMessage"),
    TutorialStepId.HOME_REORDER_HINT to ("tutorial.homeReorderHintTitle" to "tutorial.homeReorderHintMessage"),
    TutorialStepId.REORDER_DRAG to ("tutorial.reorderDragTitle" to "tutorial.reorderDragMessage"),
)

fun activeTutorialStep(
    enabled: Boolean,
    seen: Map<String, Boolean>,
    cardCount: Int,
    selectedCardIdx: Int,
    fabOpen: Boolean,
    reorderMode: Boolean,
    strings: Strings,
): TutorialStepDef? {
    if (!enabled) return null
    fun seen(id: String) = seen[id] == true
    fun make(id: String): TutorialStepDef {
        val keys = STEP_KEYS.getValue(id)
        return TutorialStepDef(
            id = id,
            title = strings.t(keys.first),
            message = strings.t(keys.second),
            target = STEP_TARGETS[id],
            index = TutorialStepId.ALL.indexOf(id),
            total = TutorialStepId.ALL.size,
        )
    }
    if (reorderMode && !seen(TutorialStepId.REORDER_DRAG)) return make(TutorialStepId.REORDER_DRAG)
    if (selectedCardIdx >= 0 && !seen(TutorialStepId.EXPANDED_TIPS)) return make(TutorialStepId.EXPANDED_TIPS)
    if (fabOpen && cardCount >= 2 && !seen(TutorialStepId.HOME_REORDER_HINT)) {
        return make(TutorialStepId.HOME_REORDER_HINT)
    }
    val atRest = !reorderMode && !fabOpen && selectedCardIdx == -1
    if (atRest) {
        if (cardCount == 0 && !seen(TutorialStepId.HOME_ADD_FIRST)) return make(TutorialStepId.HOME_ADD_FIRST)
        if (cardCount >= 1 && !seen(TutorialStepId.HOME_TAP_EXPAND)) return make(TutorialStepId.HOME_TAP_EXPAND)
        if (cardCount >= 2 && !seen(TutorialStepId.HOME_SCROLL)) return make(TutorialStepId.HOME_SCROLL)
        if (cardCount >= 1 && !seen(TutorialStepId.HOME_SHARE_TIP)) return make(TutorialStepId.HOME_SHARE_TIP)
    }
    return null
}

@Composable
fun TutorialOverlay(
    step: TutorialStepDef?,
    targetRect: Rect?,
    onDismiss: () -> Unit,
    onSkip: () -> Unit,
) {
    val visible = step != null
    val opacity by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(220, easing = EaseOutCubic),
        label = "tutorial",
    )
    if (opacity < 0.01f || step == null) return
    val colors = MaterialTheme.colorScheme
    val density = LocalDensity.current
    val cutoutRadius = if (step.target == "fab") 28.dp else 14.dp
    val paddingPx = with(density) { 8.dp.toPx() }
    val radiusPx = with(density) { cutoutRadius.toPx() }
    val cutout = targetRect?.let {
        Rect(
            left = (it.left - paddingPx).coerceAtLeast(0f),
            top = (it.top - paddingPx).coerceAtLeast(0f),
            right = it.right + paddingPx,
            bottom = it.bottom + paddingPx,
        )
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .zIndex(200f)
            .graphicsLayer {
                alpha = opacity
                compositingStrategy = CompositingStrategy.Offscreen
            },
    ) {
        val screenH = with(density) { maxHeight.toPx() }
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .clickable(onClick = onDismiss),
        ) {
            drawRect(Color.Black.copy(alpha = 0.6f))
            if (cutout != null) {
                drawRoundRect(
                    color = Color.Transparent,
                    topLeft = Offset(cutout.left, cutout.top),
                    size = Size(cutout.width, cutout.height),
                    cornerRadius = CornerRadius(radiusPx, radiusPx),
                    blendMode = BlendMode.Clear,
                )
            }
        }

        val placeBelow = if (cutout != null) {
            val above = cutout.top
            val below = screenH - cutout.bottom
            below >= above
        } else {
            true
        }
        val calloutMod = when {
            cutout == null -> Modifier.align(Alignment.Center).padding(horizontal = 24.dp)
            placeBelow -> Modifier
                .align(Alignment.TopStart)
                .padding(horizontal = 24.dp)
                .padding(top = with(density) { (cutout.bottom + 18f).toDp() })
            else -> Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 24.dp)
                .padding(bottom = with(density) { (screenH - cutout.top + 18f).toDp() })
        }

        Column(
            modifier = calloutMod
                .fillMaxWidth()
                .clip(ChromeRadius)
                .background(colors.surface)
                .border(1.dp, colors.outline, ChromeRadius)
                .padding(18.dp)
                .clickable(enabled = false, onClick = {}),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = t(
                        "tutorial.stepIndicator",
                        mapOf("current" to step.index + 1, "total" to step.total),
                    ).uppercase(),
                    color = colors.onSurfaceVariant,
                    fontFamily = Mono.bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = t("tutorial.skip").uppercase(),
                    color = colors.onSurfaceVariant,
                    fontFamily = Mono.bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp,
                    modifier = Modifier.clickable(onClick = onSkip),
                )
            }
            Text(text = step.title, color = colors.onSurface, fontFamily = Mono.bold, fontSize = 16.sp)
            Text(text = step.message, color = colors.onSurface, fontFamily = Mono.regular, fontSize = 16.sp)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TesseroneButton(
                    title = t("common.gotIt"),
                    onClick = onDismiss,
                    variant = ButtonVariant.Primary,
                )
            }
        }
    }
}
