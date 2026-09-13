package com.chipcolate.tesserone.ui.i18n

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import com.chipcolate.tesserone.core.i18n.Strings

val LocalStrings = staticCompositionLocalOf { Strings.fallback() }

@Composable
fun t(key: String, vars: Map<String, Any> = emptyMap(), count: Int? = null): String =
    LocalStrings.current.t(key, vars, count)
