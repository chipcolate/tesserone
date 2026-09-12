package com.chipcolate.tesserone.core.wear

import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/** Data Layer paths shared by the phone `:app` and `:wear` companion. */
object WearPaths {
    const val SNAPSHOT = "/tesserone/snapshot"
    const val LOGO_PREFIX = "/tesserone/logo/"
    const val REQUEST_SYNC = "/tesserone/requestInitialSync"

    const val JSON_KEY = "json"
    const val LOGO_KEY = "logoKey"
    const val UPDATED_AT = "updatedAt"
    const val IMAGE = "image"

    fun logoPath(logoKey: String): String =
        LOGO_PREFIX + URLEncoder.encode(logoKey, StandardCharsets.UTF_8.name())

    fun logoKeyFromPath(path: String?): String? {
        if (path.isNullOrEmpty() || !path.startsWith(LOGO_PREFIX)) return null
        return URLDecoder.decode(path.removePrefix(LOGO_PREFIX), StandardCharsets.UTF_8.name())
    }
}
