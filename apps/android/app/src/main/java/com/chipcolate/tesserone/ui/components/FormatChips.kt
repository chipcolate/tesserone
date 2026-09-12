package com.chipcolate.tesserone.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipcolate.tesserone.core.barcode.BARCODE_FORMAT_OPTIONS
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono

@Composable
fun FormatChips(
    selected: BarcodeFormat,
    onSelect: (BarcodeFormat) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MaterialTheme.colorScheme
    Box(modifier = modifier) {
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
        ) {
            BARCODE_FORMAT_OPTIONS.forEach { opt ->
                val on = selected == opt.value
                Box(
                    modifier = Modifier
                        .padding(end = 8.dp)
                        .clip(ChromeRadius)
                        .background(if (on) Accent else colors.surface)
                        .border(1.dp, if (on) Accent else colors.outline, ChromeRadius)
                        .clickable { onSelect(opt.value) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    Text(
                        text = opt.label,
                        color = if (on) Color.White else colors.onSurface,
                        fontFamily = if (on) Mono.bold else Mono.regular,
                        fontSize = 12.sp,
                    )
                }
            }
        }
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .width(28.dp)
                .fillMaxHeight()
                .background(
                    Brush.horizontalGradient(
                        listOf(colors.background.copy(alpha = 0f), colors.background),
                    ),
                ),
        )
    }
}
