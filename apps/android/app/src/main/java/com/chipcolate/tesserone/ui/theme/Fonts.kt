package com.chipcolate.tesserone.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import com.chipcolate.tesserone.R

/**
 * JetBrains Mono faces, one [FontFamily] per file. Do not pass [androidx.compose.ui.text.font.FontWeight]
 * on top of these — Android will faux-bold the Regular cut.
 */
object Mono {
    val regular = FontFamily(Font(R.font.jetbrainsmono_regular))
    val medium = FontFamily(Font(R.font.jetbrainsmono_medium))
    val bold = FontFamily(Font(R.font.jetbrainsmono_bold))
    val extraBold = FontFamily(Font(R.font.jetbrainsmono_extrabold))
}
