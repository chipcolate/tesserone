package com.chipcolate.tesserone.ui.wallet

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.chipcolate.tesserone.core.barcode.BarcodeEncoder
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.parseHexColor
import com.chipcolate.tesserone.ui.theme.textOnColor

private val Square2d = setOf(BarcodeFormat.QR, BarcodeFormat.AZTEC, BarcodeFormat.DATAMATRIX)

@Composable
fun CardBack(
    card: FidelityCard,
    brands: BrandIndex,
    modifier: Modifier = Modifier,
) {
    val bgHex = brands.cardBackground(card.color, card.logoSlug)
    val fg = textOnColor(bgHex)
    val isSquare2d = card.format in Square2d
    val barcodeHeight = if (isSquare2d) 220.dp else 130.dp
    val density = LocalDensity.current
    var tileSize by remember { mutableStateOf(IntSize.Zero) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(CardStackDp.CARD_RADIUS.dp))
            .background(parseHexColor(bgHex))
            .padding(start = 24.dp, top = 24.dp, end = 24.dp, bottom = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(2.dp))
                .background(Color.White)
                .padding(16.dp)
                .fillMaxWidth()
                .onSizeChanged { tileSize = it },
            contentAlignment = Alignment.Center,
        ) {
            val heightPx = with(density) { barcodeHeight.roundToPx() }
            val widthPx = if (isSquare2d) heightPx else tileSize.width.coerceAtLeast(1)
            val bitmap = remember(card.code, card.format, widthPx, heightPx) {
                if (widthPx <= 1 && !isSquare2d) null
                else BarcodeEncoder.encodeBitmap(card.code, card.format, widthPx, heightPx)
            }
            when {
                bitmap != null -> Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = card.code,
                    modifier = if (isSquare2d) {
                        Modifier.size(barcodeHeight)
                    } else {
                        Modifier
                            .fillMaxWidth()
                            .height(barcodeHeight)
                    },
                    contentScale = ContentScale.FillBounds,
                    filterQuality = FilterQuality.None,
                )
                tileSize.width > 0 || isSquare2d -> Text(
                    text = "Could not render barcode",
                    color = Color(0xFF999999),
                    fontFamily = Mono.regular,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(vertical = 24.dp),
                )
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = card.name,
                color = fg,
                fontFamily = Mono.medium,
                fontSize = 18.sp,
                letterSpacing = (-0.2).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = card.code,
                color = fg.copy(alpha = 0.7f),
                fontFamily = Mono.regular,
                fontSize = 16.sp,
                letterSpacing = 1.5.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            val notes = card.notes
            if (!notes.isNullOrBlank()) {
                Text(
                    text = notes,
                    color = fg.copy(alpha = 0.7f),
                    fontFamily = Mono.regular,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth(0.9f),
                )
            }
        }
    }
}
