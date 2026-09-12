package com.chipcolate.tesserone.core.brands

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class BrandEntry(
    val slug: String,
    val name: String,
    val aliases: List<String> = emptyList(),
    val alt: String = "",
    val primaryColor: String = "",
    val secondaryColor: String = "",
    val logo: String = "",
)

class BrandIndex(val brands: List<BrandEntry>) {
    fun get(slug: String): BrandEntry? = brands.find { it.slug == slug }

    /** Explicit color → brand primary → `#333333`. */
    fun cardBackground(color: String?, logoSlug: String?): String {
        if (!color.isNullOrBlank()) return color
        val primary = logoSlug?.let { get(it)?.primaryColor }
        if (!primary.isNullOrBlank()) return primary
        return FALLBACK_CARD_BG
    }

    /** Case-insensitive contains over name, slug, and aliases. */
    fun search(query: String): List<BrandEntry> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return emptyList()
        return brands.filter { brand ->
            brand.name.lowercase().contains(q) ||
                brand.slug.lowercase().contains(q) ||
                brand.aliases.any { it.lowercase().contains(q) }
        }
    }

    companion object {
        const val FALLBACK_CARD_BG = "#333333"

        private val json = Json { ignoreUnknownKeys = true }

        fun fromJson(text: String): BrandIndex =
            BrandIndex(json.decodeFromString<List<BrandEntry>>(text))

        fun fromAssets(context: Context): BrandIndex {
            val text = context.assets.open("brands/brand-index.json")
                .bufferedReader()
                .use { it.readText() }
            return fromJson(text)
        }
    }
}
