package com.chipcolate.tesserone.ui.theme

import androidx.compose.ui.graphics.Color

const val LIGHT_TEXT_ON_COLOR_THRESHOLD = 155

fun parseHexColor(hex: String): Color {
    val c = hex.removePrefix("#")
    val full = when (c.length) {
        3 -> "${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}"
        6, 8 -> c
        else -> "333333"
    }
    val r = full.substring(0, 2).toIntOrNull(16) ?: 0x33
    val g = full.substring(2, 4).toIntOrNull(16) ?: 0x33
    val b = full.substring(4, 6).toIntOrNull(16) ?: 0x33
    val a = if (full.length >= 8) full.substring(6, 8).toIntOrNull(16) ?: 0xFF else 0xFF
    return Color(red = r, green = g, blue = b, alpha = a)
}

fun isLightColor(hex: String): Boolean {
    val c = hex.removePrefix("#")
    if (c.length < 6) return false
    val r = c.substring(0, 2).toIntOrNull(16) ?: return false
    val g = c.substring(2, 4).toIntOrNull(16) ?: return false
    val b = c.substring(4, 6).toIntOrNull(16) ?: return false
    return (r * 299 + g * 587 + b * 114) / 1000 > LIGHT_TEXT_ON_COLOR_THRESHOLD
}

fun textOnColor(hex: String): Color = if (isLightColor(hex)) Color.Black else Color.White
