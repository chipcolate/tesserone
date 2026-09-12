package com.chipcolate.tesserone.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.palette


enum class ButtonVariant { Primary, Secondary, Danger, Ghost }

@Composable
fun TesseroneButton(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Secondary,
    enabled: Boolean = true,
) {
    val colors = MaterialTheme.colorScheme
    val palette = palette()
    val bg = when (variant) {
        ButtonVariant.Primary -> Accent
        ButtonVariant.Secondary -> colors.surface
        ButtonVariant.Danger -> palette.danger
        ButtonVariant.Ghost -> Color.Transparent
    }
    val fg = when (variant) {
        ButtonVariant.Primary -> Color.White
        ButtonVariant.Secondary -> colors.onSurface
        ButtonVariant.Danger -> palette.dangerText
        ButtonVariant.Ghost -> colors.onSurface
    }
    val border = when (variant) {
        ButtonVariant.Primary -> Accent
        ButtonVariant.Secondary -> colors.outline
        ButtonVariant.Danger -> palette.danger
        ButtonVariant.Ghost -> colors.outline
    }
    Box(
        modifier = modifier
            .clip(ChromeRadius)
            .background(bg)
            .border(1.dp, border, ChromeRadius)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = title,
            color = fg.copy(alpha = if (enabled) 1f else 0.4f),
            fontFamily = Mono.bold,
            fontSize = 14.sp,
            letterSpacing = 0.3.sp,
        )
    }
}

@Composable
fun ActionBar(content: @Composable RowScope.() -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.background)
            .border(0.dp, Color.Transparent)
            .padding(top = 1.dp)
            .drawTopHairline(colors.outline)
            .navigationBarsPadding()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
fun Panel(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = modifier
            .clip(ChromeRadius)
            .background(colors.surface)
            .border(1.dp, colors.outline, ChromeRadius),
        content = { content() },
    )
}

@Composable
fun TesseroneField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    singleLine: Boolean = true,
    minHeight: Int = 48,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    val colors = MaterialTheme.colorScheme
    val style = TextStyle(
        fontFamily = Mono.regular,
        fontSize = 16.sp,
        color = colors.onSurface,
    )
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = minHeight.dp)
            .clip(ChromeRadius)
            .background(colors.surface)
            .border(1.dp, colors.outline, ChromeRadius)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        textStyle = style,
        singleLine = singleLine,
        cursorBrush = SolidColor(colors.onSurface),
        keyboardOptions = KeyboardOptions(
            capitalization = capitalization,
            keyboardType = keyboardType,
            autoCorrectEnabled = false,
        ),
        decorationBox = { inner ->
            Box(contentAlignment = if (singleLine) Alignment.CenterStart else Alignment.TopStart) {
                if (value.isEmpty()) {
                    Text(
                        text = placeholder,
                        color = colors.onSurfaceVariant,
                        fontFamily = Mono.regular,
                        fontSize = 16.sp,
                    )
                }
                inner()
            }
        },
    )
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    val colors = MaterialTheme.colorScheme
    Text(
        text = text.uppercase(),
        color = colors.onSurfaceVariant,
        fontFamily = Mono.bold,
        fontSize = 13.sp,
        letterSpacing = 0.8.sp,
        modifier = modifier.padding(bottom = 6.dp, top = 16.dp),
    )
}

@Composable
fun ConfirmDialog(
    title: String,
    body: String,
    confirmLabel: String,
    cancelLabel: String,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
    destructive: Boolean = false,
) {
    val colors = MaterialTheme.colorScheme
    val palette = palette()
    Box(modifier = Modifier.fillMaxSize().zIndex(200f)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable(onClick = onCancel),
        )
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 28.dp)
                .clip(ChromeRadius)
                .background(colors.surface)
                .border(1.dp, colors.outline, ChromeRadius)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(text = title, color = colors.onSurface, fontFamily = Mono.bold, fontSize = 16.sp)
            Text(text = body, color = colors.onSurface, fontFamily = Mono.regular, fontSize = 14.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                TesseroneButton(
                    title = cancelLabel,
                    onClick = onCancel,
                    variant = ButtonVariant.Secondary,
                    modifier = Modifier.weight(1f),
                )
                TesseroneButton(
                    title = confirmLabel,
                    onClick = onConfirm,
                    variant = if (destructive) ButtonVariant.Danger else ButtonVariant.Primary,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
fun AppSnackbar(
    message: String,
    actionLabel: String?,
    onAction: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxSize()
            .zIndex(180f)
            .padding(horizontal = 16.dp)
            .navigationBarsPadding()
            .padding(bottom = 24.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(ChromeRadius)
                .background(colors.surface)
                .border(1.dp, colors.outline, ChromeRadius)
                .clickable(onClick = onDismiss)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = message,
                color = colors.onSurface,
                fontFamily = Mono.regular,
                fontSize = 13.sp,
                modifier = Modifier.weight(1f),
            )
            if (actionLabel != null) {
                Text(
                    text = actionLabel.uppercase(),
                    color = Accent,
                    fontFamily = Mono.bold,
                    fontSize = 12.sp,
                    letterSpacing = 0.6.sp,
                    modifier = Modifier.clickable(onClick = onAction),
                )
            }
        }
    }
}

@Composable
fun BottomSheet(
    title: String,
    onClose: () -> Unit,
    content: @Composable () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Box(modifier = Modifier.fillMaxSize().zIndex(120f)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
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
                text = title.uppercase(),
                color = colors.onSurfaceVariant,
                fontFamily = Mono.bold,
                fontSize = 13.sp,
                letterSpacing = 0.8.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            )
            content()
        }
    }
}

private fun Modifier.drawTopHairline(color: Color): Modifier = drawBehind {
    drawLine(
        color = color,
        start = Offset(0f, 0f),
        end = Offset(size.width, 0f),
        strokeWidth = 1.dp.toPx(),
    )
}
