package com.chipcolate.tesserone.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.layout.height
import androidx.glance.text.FontFamily
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.chipcolate.tesserone.MainActivity
import com.chipcolate.tesserone.ui.theme.parseHexColor
import kotlin.math.floor
import kotlin.math.min

private val ChromeDark = Color(0xFF0A0A0A)
private val ChromeLight = Color(0xFFFAFAF8)
private val TextDark = Color(0xFFF5F5F5)
private val TextLight = Color(0xFF1A1A1A)
private val TileRadius = 2.dp

internal fun openCardIntent(context: Context, cardId: String): Intent =
    Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        data = Uri.parse("tesserone://open/$cardId")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP
    }

internal fun openAppIntent(context: Context): Intent =
    Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

@Composable
internal fun SingleCardContent(context: Context, model: WidgetModel) {
    val card = model.cards.firstOrNull()
    if (card == null) {
        EmptyWidget(context, model)
        return
    }
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(parseHexColor(card.color))
            .cornerRadius(TileRadius)
            .clickable(onClick = actionStartActivity(openCardIntent(context, card.id)))
            .padding(8.dp),
        contentAlignment = Alignment.Center,
    ) {
        LogoOrInitial(card, 56.dp)
    }
}

@Composable
internal fun CardListContent(context: Context, model: WidgetModel) {
    if (model.cards.isEmpty()) {
        EmptyWidget(context, model)
        return
    }
    val size = LocalSize.current
    val w = if (size.width.value > 0f) size.width.value else 250f
    val h = if (size.height.value > 0f) size.height.value else 110f
    val pad = 6f
    val gap = 6f
    val minTile = 52f
    val maxTile = 88f
    val innerW = w - pad * 2
    val innerH = h - pad * 2
    val cols = maxOf(
        1,
        min(model.cards.size, floor((innerW + gap) / (minTile + gap)).toInt()),
    )
    val tile = min(maxTile, floor((innerW - gap * (cols - 1)) / cols))
    val rowsThatFit = maxOf(1, floor((innerH + gap) / (tile + gap)).toInt())
    val shown = model.cards.take(cols * rowsThatFit)
    val rows = shown.chunked(cols)
    val chrome = if (model.darkChrome) ChromeDark else ChromeLight
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(chrome)
            .padding(pad.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        rows.forEachIndexed { ri, row ->
            if (ri > 0) Spacer(modifier = GlanceModifier.height(gap.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                row.forEachIndexed { ci, card ->
                    if (ci > 0) Spacer(modifier = GlanceModifier.width(gap.dp))
                    Box(
                        modifier = GlanceModifier
                            .size(tile.dp)
                            .background(parseHexColor(card.color))
                            .cornerRadius(TileRadius)
                            .clickable(onClick = actionStartActivity(openCardIntent(context, card.id)))
                            .padding((tile * 0.14f).dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        LogoOrInitial(card, (tile * 0.66f).dp)
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyWidget(context: Context, model: WidgetModel) {
    val chrome = if (model.darkChrome) ChromeDark else ChromeLight
    val fg = if (model.darkChrome) TextDark else TextLight
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(chrome)
            .clickable(onClick = actionStartActivity(openAppIntent(context)))
            .padding(8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = model.emptyLabel,
            style = TextStyle(
                color = ColorProvider(fg),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                textAlign = TextAlign.Center,
            ),
        )
    }
}

@Composable
private fun LogoOrInitial(card: WidgetCardView, size: Dp) {
    val logo = card.logo
    if (logo != null) {
        Image(
            provider = ImageProvider(logo),
            contentDescription = card.name,
            modifier = GlanceModifier.size(size),
            contentScale = ContentScale.Fit,
        )
    } else {
        Text(
            text = card.initial,
            style = TextStyle(
                color = ColorProvider(if (card.lightText) Color.White else Color.Black),
                fontSize = (size.value * 0.5f).sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                textAlign = TextAlign.Center,
            ),
        )
    }
}
