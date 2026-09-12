package com.chipcolate.tesserone.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.chipcolate.tesserone.HomeViewModel
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.ui.i18n.LocalStrings
import com.chipcolate.tesserone.ui.i18n.t
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.tutorial.TutorialOverlay
import com.chipcolate.tesserone.ui.tutorial.activeTutorialStep
import com.chipcolate.tesserone.ui.wallet.CardStack
import com.chipcolate.tesserone.ui.wallet.CardStackController
import com.chipcolate.tesserone.ui.wallet.EaseOutCubic
import kotlinx.coroutines.delay

private val SortOptions = listOf(
    SortMode.ALPHABETICAL to "sort.alphabetical",
    SortMode.DATE_CREATED to "sort.dateAdded",
    SortMode.DATE_MODIFIED to "sort.dateModified",
    SortMode.MANUAL to "sort.manual",
)

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onMaxBrightness: () -> Unit,
    onRestoreBrightness: () -> Unit,
    onAdd: () -> Unit,
    onSettings: () -> Unit,
    onEdit: (String) -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val cards = viewModel.cards
    val sortMode = viewModel.settings.sortMode
    var reorderMode by remember { mutableStateOf(false) }
    var fabOpen by remember { mutableStateOf(false) }
    var sortSheetOpen by remember { mutableStateOf(false) }
    var stackController by remember { mutableStateOf<CardStackController?>(null) }
    var fabRect by remember { mutableStateOf<Rect?>(null) }
    var reorderRect by remember { mutableStateOf<Rect?>(null) }
    val fabProgress by animateFloatAsState(
        targetValue = if (fabOpen) 1f else 0f,
        animationSpec = tween(200, easing = EaseOutCubic),
        label = "fab",
    )
    val selectedCardIdx = stackController?.selectedIndex ?: -1
    val strings = LocalStrings.current
    val tutorialStep = activeTutorialStep(
        enabled = viewModel.tutorial.enabled,
        seen = viewModel.tutorial.seenSteps,
        cardCount = cards.size,
        selectedCardIdx = selectedCardIdx,
        fabOpen = fabOpen,
        reorderMode = reorderMode,
        strings = strings,
    )
    val targetRect = when (tutorialStep?.target) {
        "fab" -> fabRect
        "reorderItem" -> reorderRect
        else -> null
    }

    LaunchedEffect(viewModel.pendingOpenId, viewModel.pendingOpenNonce, cards, viewModel.ready) {
        val openId = viewModel.pendingOpenId ?: return@LaunchedEffect
        if (!viewModel.ready) return@LaunchedEffect
        var tries = 0
        while (tries < 8) {
            val idx = cards.indexOfFirst { it.id == openId }
            if (idx < 0) return@LaunchedEffect
            if (stackController?.selectCardByIndex(idx) == true) {
                viewModel.clearPendingOpen()
                return@LaunchedEffect
            }
            tries++
            delay(100)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding(),
        ) {
            Header(
                count = cards.size,
                reorderMode = reorderMode,
                onDone = { reorderMode = false },
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
            ) {
                if (cards.isEmpty()) {
                    EmptyState(onClick = onAdd)
                } else {
                    CardStack(
                        cards = cards,
                        brands = viewModel.brands,
                        filesDir = viewModel.filesDir,
                        reorderMode = reorderMode,
                        onReorder = viewModel::reorderCards,
                        onEdit = { onEdit(it.id) },
                        onMaxBrightness = onMaxBrightness,
                        onRestoreBrightness = onRestoreBrightness,
                        onControllerReady = { stackController = it },
                    )
                }
            }
        }

        if (fabProgress > 0.01f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .zIndex(90f)
                    .background(androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.5f * fabProgress))
                    .clickable { fabOpen = false },
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .navigationBarsPadding()
                .padding(end = 16.dp, bottom = 80.dp)
                .zIndex(95f),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (fabProgress > 0.2f) {
                FabMenuItem(label = t("home.settings"), onClick = { fabOpen = false; onSettings() })
            }
            if (fabProgress > 0.3f) {
                FabMenuItem(label = t("home.addCard"), onClick = { fabOpen = false; onAdd() })
            }
            if (fabProgress > 0.5f) {
                FabMenuItem(
                    label = if (reorderMode) t("home.reorderDone") else t("home.reorder"),
                    onClick = {
                        fabOpen = false
                        reorderMode = !reorderMode
                        if (reorderMode) viewModel.setSortMode(SortMode.MANUAL)
                    },
                    onPositioned = { reorderRect = it },
                )
            }
            if (fabProgress > 0.5f) {
                FabMenuItem(
                    label = t("home.sort"),
                    onClick = {
                        fabOpen = false
                        sortSheetOpen = true
                    },
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .navigationBarsPadding()
                .padding(end = 16.dp, bottom = 8.dp)
                .zIndex(100f)
                .size(56.dp)
                .clip(ChromeRadius)
                .background(Accent)
                .onGloballyPositioned { coords ->
                    val pos = coords.positionInWindow()
                    fabRect = Rect(pos.x, pos.y, pos.x + coords.size.width, pos.y + coords.size.height)
                }
                .clickable { fabOpen = !fabOpen },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "☰",
                color = colors.onPrimary,
                fontFamily = Mono.bold,
                fontSize = 22.sp,
                modifier = Modifier.rotate(fabProgress * 90f),
            )
        }

        if (sortSheetOpen) {
            SortSheet(
                current = sortMode,
                onClose = { sortSheetOpen = false },
                onChoose = { mode ->
                    viewModel.setSortMode(mode)
                    reorderMode = mode == SortMode.MANUAL
                    sortSheetOpen = false
                },
            )
        }

        TutorialOverlay(
            step = tutorialStep,
            targetRect = targetRect,
            onDismiss = { tutorialStep?.let { viewModel.markTutorialSeen(it.id) } },
            onSkip = { viewModel.skipTutorial() },
        )
    }
}

@Composable
private fun Header(count: Int, reorderMode: Boolean, onDone: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                val y = size.height - 0.5.dp.toPx()
                drawLine(
                    color = colors.outline,
                    start = Offset(0f, y),
                    end = Offset(size.width, y),
                    strokeWidth = 1.dp.toPx(),
                )
            }
            .padding(start = 24.dp, end = 24.dp, top = 8.dp, bottom = 14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "TESSERONE",
                color = colors.onBackground,
                fontFamily = Mono.extraBold,
                fontSize = 22.sp,
                letterSpacing = (-1).sp,
            )
            Spacer(Modifier.weight(1f))
            if (reorderMode) {
                Box(
                    modifier = Modifier
                        .clip(ChromeRadius)
                        .background(Accent)
                        .clickable(onClick = onDone)
                        .padding(horizontal = 16.dp, vertical = 7.dp),
                ) {
                    Text(
                        text = t("home.reorderDone"),
                        color = colors.onPrimary,
                        fontFamily = Mono.bold,
                        fontSize = 13.sp,
                        letterSpacing = 0.5.sp,
                    )
                }
            }
        }
        Text(
            text = if (reorderMode) {
                t("home.reordering").uppercase()
            } else {
                t("home.cardCount", count = count).uppercase()
            },
            color = if (reorderMode) Accent else colors.onSurfaceVariant,
            fontFamily = Mono.regular,
            fontSize = 12.sp,
            letterSpacing = 1.sp,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
private fun EmptyState(onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .drawBehind {
                    drawRoundRect(
                        color = colors.outline,
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx()),
                        style = Stroke(
                            width = 1.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f)),
                        ),
                    )
                }
                .clickable(onClick = onClick),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "+",
                color = colors.onSurfaceVariant,
                fontFamily = Mono.regular,
                fontSize = 48.sp,
            )
            Text(
                text = t("home.emptyState"),
                color = colors.onSurfaceVariant,
                fontFamily = Mono.regular,
                fontSize = 13.sp,
                letterSpacing = 0.5.sp,
            )
        }
    }
}

@Composable
private fun FabMenuItem(
    label: String,
    onClick: () -> Unit,
    onPositioned: ((Rect) -> Unit)? = null,
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .clip(ChromeRadius)
            .background(colors.surface)
            .border(1.dp, colors.outline, ChromeRadius)
            .onGloballyPositioned { coords ->
                if (onPositioned != null) {
                    val pos = coords.positionInWindow()
                    onPositioned(Rect(pos.x, pos.y, pos.x + coords.size.width, pos.y + coords.size.height))
                }
            }
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Text(
            text = label,
            color = colors.onSurface,
            fontFamily = Mono.medium,
            fontSize = 15.sp,
        )
    }
}

@Composable
private fun SortSheet(
    current: SortMode,
    onClose: () -> Unit,
    onChoose: (SortMode) -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Box(modifier = Modifier.fillMaxSize().zIndex(120f)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.5f))
                .clickable(onClick = onClose),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                .background(colors.surface)
                .border(1.dp, colors.outline, RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                .navigationBarsPadding()
                .padding(top = 10.dp, bottom = 12.dp),
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .width(36.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(colors.outline),
            )
            Text(
                text = t("sort.title").uppercase(),
                color = colors.onSurfaceVariant,
                fontFamily = Mono.bold,
                fontSize = 13.sp,
                letterSpacing = 0.8.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            )
            SortOptions.forEach { (mode, key) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onChoose(mode) }
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = t(key),
                        color = colors.onSurface,
                        fontFamily = Mono.regular,
                        fontSize = 16.sp,
                        modifier = Modifier.weight(1f),
                    )
                    if (current == mode) {
                        Text(
                            text = "✓",
                            color = Accent,
                            fontFamily = Mono.regular,
                            fontSize = 16.sp,
                        )
                    }
                }
            }
        }
    }
}
