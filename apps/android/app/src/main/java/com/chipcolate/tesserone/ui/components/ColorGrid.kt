package com.chipcolate.tesserone.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.chipcolate.tesserone.ui.theme.CardColors
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.parseHexColor

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ColorGrid(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MaterialTheme.colorScheme
    FlowRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        CardColors.forEach { hex ->
            val on = selected.equals(hex, ignoreCase = true)
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(ChromeRadius)
                    .background(parseHexColor(hex))
                    .border(
                        width = if (on) 3.dp else 1.dp,
                        color = if (on) colors.onBackground else colors.outline,
                        shape = ChromeRadius,
                    )
                    .clickable { onSelect(hex) },
            )
        }
    }
}
