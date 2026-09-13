package com.chipcolate.tesserone.wear.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Text
import com.chipcolate.tesserone.core.barcode.BarcodeEncoder
import com.chipcolate.tesserone.core.barcode.isWatchRenderable
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.WatchSnapshotCard

@Composable
fun BarcodeScreen(card: WatchSnapshotCard) {
    val strings = LocalWearStrings.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (!card.format.isWatchRenderable()) {
            Text(
                text = strings.t("watch.unsupportedFormat", mapOf("format" to card.format.name)),
                color = Color.Black,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
            )
            Text(
                text = strings.t("watch.openOnPhone"),
                color = Color.DarkGray,
                fontSize = 11.sp,
                modifier = Modifier.padding(top = 6.dp),
            )
        } else {
            val bmp = remember(card.code, card.format) {
                val (w, h) = if (card.format == BarcodeFormat.QR) 400 to 400 else 480 to 160
                BarcodeEncoder.encodeBitmap(card.code, card.format, w, h)
            }
            if (bmp == null) {
                Text(
                    text = strings.t("watch.invalidBarcode", mapOf("format" to card.format.name)),
                    color = Color.DarkGray,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center,
                )
            } else {
                Image(
                    bitmap = bmp.asImageBitmap(),
                    contentDescription = card.name,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(4.dp),
                    contentScale = ContentScale.Fit,
                )
            }
            Text(
                text = card.code,
                color = Color.Black,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }
    }
}

@Composable
fun StatusScreen(title: String, body: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = title, fontSize = 14.sp, textAlign = TextAlign.Center)
        Text(
            text = body,
            fontSize = 12.sp,
            color = Color.Gray,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}
