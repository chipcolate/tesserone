package com.chipcolate.tesserone.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipcolate.tesserone.core.model.ThemeMode

val Accent = Color(0xFF6C2DD7)
val DefaultCardColor = "#42A5F5"

val CardColors: List<String> = listOf(
    "#EF5350", "#D32F2F", "#EC407A", "#C2185B", "#AB47BC", "#7B1FA2",
    "#5C6BC0", "#303F9F", "#42A5F5", "#1565C0", "#26C6DA", "#00838F",
    "#66BB6A", "#2E7D32", "#9CCC65", "#689F38", "#FFCA28", "#F9A825",
    "#FFA726", "#E65100", "#8D6E63", "#4E342E", "#78909C", "#37474F",
    "#000000", "#CCCCCC", "#FFFFFF",
)

val ChromeRadius = RoundedCornerShape(4.dp)
val CardRadius = RoundedCornerShape(2.dp)
val TileRadius = RoundedCornerShape(2.dp)

data class Palette(
    val danger: Color,
    val dangerText: Color,
    val borderStrong: Color,
    val isDark: Boolean,
)

val LocalPalette = staticCompositionLocalOf {
    Palette(
        danger = Color(0xFFFF6B6B),
        dangerText = Color.White,
        borderStrong = Color(0xFF3D3D3D),
        isDark = true,
    )
}

@Composable
fun palette(): Palette = LocalPalette.current

@Composable
fun TesseroneTheme(
    themeMode: ThemeMode,
    content: @Composable () -> Unit,
) {
    val dark = when (themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    val bg = if (dark) Color(0xFF0A0A0A) else Color(0xFFFAFAF8)
    val text = if (dark) Color(0xFFF5F5F5) else Color(0xFF1A1A1A)
    val surface = if (dark) Color(0xFF161616) else Color(0xFFF0F0ED)
    val border = if (dark) Color(0xFF2A2A2A) else Color(0xFFE2E2DD)
    val secondary = if (dark) Color(0xFF888888) else Color(0xFF666666)
    val palette = if (dark) {
        Palette(
            danger = Color(0xFFFF6B6B),
            dangerText = Color.White,
            borderStrong = Color(0xFF3D3D3D),
            isDark = true,
        )
    } else {
        Palette(
            danger = Color(0xFFD32F2F),
            dangerText = Color.White,
            borderStrong = Color(0xFFC8C8C0),
            isDark = false,
        )
    }
    val scheme = if (dark) {
        darkColorScheme(
            background = bg,
            surface = surface,
            onBackground = text,
            onSurface = text,
            primary = Accent,
            onPrimary = Color.White,
            outline = border,
            onSurfaceVariant = secondary,
        )
    } else {
        lightColorScheme(
            background = bg,
            surface = surface,
            onBackground = text,
            onSurface = text,
            primary = Accent,
            onPrimary = Color.White,
            outline = border,
            onSurfaceVariant = secondary,
        )
    }
    val typography = MaterialTheme.typography.copy(
        displayLarge = TextStyle(fontFamily = Mono.extraBold, fontSize = 28.sp, color = text),
        titleLarge = TextStyle(fontFamily = Mono.extraBold, fontSize = 24.sp, color = text),
        titleMedium = TextStyle(fontFamily = Mono.bold, fontSize = 18.sp, color = text),
        bodyLarge = TextStyle(fontFamily = Mono.regular, fontSize = 16.sp, color = text),
        bodyMedium = TextStyle(fontFamily = Mono.regular, fontSize = 14.sp, color = text),
        labelLarge = TextStyle(fontFamily = Mono.bold, fontSize = 14.sp, color = text),
        labelMedium = TextStyle(fontFamily = Mono.bold, fontSize = 13.sp, color = text, letterSpacing = 0.8.sp),
        labelSmall = TextStyle(fontFamily = Mono.regular, fontSize = 12.sp, color = secondary),
    )
    CompositionLocalProvider(LocalPalette provides palette) {
        MaterialTheme(colorScheme = scheme, typography = typography, content = content)
    }
}
