package com.chipcolate.tesserone.wear.ui

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Vignette
import androidx.wear.compose.material.VignettePosition
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.brands.initial
import com.chipcolate.tesserone.core.brands.loadBundledLogoBitmap
import com.chipcolate.tesserone.core.model.WatchSnapshotCard
import java.io.File

@Composable
fun CardListScreen(
    cards: List<WatchSnapshotCard>,
    logos: Map<String, File>,
    onOpen: (String) -> Unit,
) {
    val listState = rememberScalingLazyListState()
    Scaffold(
        timeText = { TimeText() },
        vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
        ) {
            item {
                Text(
                    text = "Tesserone",
                    fontSize = 16.sp,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
            items(cards, key = { it.id }) { card ->
                CardRow(card = card, logoFile = card.logoKey?.let { logos[it] }, onOpen = onOpen)
            }
        }
    }
}

@Composable
private fun CardRow(
    card: WatchSnapshotCard,
    logoFile: File?,
    onOpen: (String) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen(card.id) }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LogoThumbnail(card, logoFile)
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = card.name,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            fontSize = 15.sp,
        )
    }
}

@Composable
private fun LogoThumbnail(card: WatchSnapshotCard, logoFile: File?) {
    val context = LocalContext.current
    val bmp = remember(card.id, card.logoSlug, card.hasCustomLogo, logoFile?.path, logoFile?.lastModified()) {
        if (logoFile != null && logoFile.isFile) {
            BitmapFactory.decodeFile(logoFile.absolutePath)
        } else if (!card.logoSlug.isNullOrBlank()) {
            val brands = runCatching { BrandIndex.fromAssets(context) }.getOrNull()
            if (brands != null) loadBundledLogoBitmap(context, card.logoSlug, brands) else null
        } else {
            null
        }
    }
    val bg = parseWatchColor(card.color)
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(bg),
        contentAlignment = Alignment.Center,
    ) {
        if (bmp != null) {
            Image(
                bitmap = bmp.asImageBitmap(),
                contentDescription = card.name,
                modifier = Modifier.fillMaxSize().padding(2.dp),
                contentScale = ContentScale.Fit,
            )
        } else {
            Text(
                text = card.initial(),
                color = readableOn(bg),
                fontSize = 12.sp,
            )
        }
    }
}

internal fun parseWatchColor(hex: String?): Color {
    val c = hex?.removePrefix("#").orEmpty()
    val full = when (c.length) {
        3 -> "${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}"
        6, 8 -> c
        else -> "888888"
    }
    val r = full.substring(0, 2).toIntOrNull(16) ?: 0x88
    val g = full.substring(2, 4).toIntOrNull(16) ?: 0x88
    val b = full.substring(4, 6).toIntOrNull(16) ?: 0x88
    return Color(red = r / 255f, green = g / 255f, blue = b / 255f)
}

internal fun readableOn(bg: Color): Color {
    val luminance = (bg.red * 299 + bg.green * 587 + bg.blue * 114) / 1000
    return if (luminance > 0.6f) Color.Black else Color.White
}
