package com.chipcolate.tesserone.core.io

import com.chipcolate.tesserone.core.model.EXPORT_VERSION
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.Settings
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.ThemeMode
import com.chipcolate.tesserone.core.model.WalletJson
import com.chipcolate.tesserone.core.model.customLogoFilename
import com.chipcolate.tesserone.core.model.normalizeFormat
import com.chipcolate.tesserone.core.model.nowIso
import com.chipcolate.tesserone.core.store.customLogoToDataUri
import com.chipcolate.tesserone.core.store.writeCustomLogoFromDataUri
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.time.Instant

enum class MergeStrategy { KeepExisting, UseImported, KeepNewer }

data class ExportData(
    val cards: List<FidelityCard>,
    val settings: Settings,
    val exportedAt: String,
    val version: String,
)

sealed class ImportResult {
    data class Ok(val data: ExportData) : ImportResult()
    data class Err(val error: String) : ImportResult()
}

private fun JsonObject.str(key: String): String? =
    this[key]?.jsonPrimitive?.contentOrNull

private fun JsonObject.int(key: String): Int? =
    this[key]?.jsonPrimitive?.intOrNull

fun parseExport(jsonText: String, logosDir: File): ImportResult {
    val root = try {
        WalletJson.json.parseToJsonElement(jsonText)
    } catch (_: Exception) {
        return ImportResult.Err("Invalid file format")
    }
    if (root !is JsonObject) return ImportResult.Err("Invalid file format")
    val rawCards = root["cards"] ?: return ImportResult.Err("Missing or invalid cards array")
    val array = try {
        rawCards.jsonArray
    } catch (_: Exception) {
        return ImportResult.Err("Missing or invalid cards array")
    }
    val migrated = mutableListOf<FidelityCard>()
    for ((index, el) in array.withIndex()) {
        val obj = el as? JsonObject ?: return ImportResult.Err("Invalid card data — missing required fields")
        val id = obj.str("id")
        val name = obj.str("name")
        val code = obj.str("code")
        val format = obj.str("format")
        if (id == null || name == null || code == null || format == null) {
            return ImportResult.Err("Invalid card data — missing required fields")
        }
        migrated += migrateImportedCard(obj, index, logosDir)
    }
    val settings = narrowSettings(root["settings"])
    val version = root.str("version") ?: "1.0.0"
    val exportedAt = root.str("exportedAt") ?: nowIso()
    return ImportResult.Ok(ExportData(migrated, settings, exportedAt, version))
}

private fun migrateImportedCard(obj: JsonObject, index: Int, logosDir: File): FidelityCard {
    val now = nowIso()
    return FidelityCard(
        id = obj.str("id")!!,
        name = obj.str("name")!!,
        code = obj.str("code")!!,
        format = normalizeFormat(obj.str("format")!!),
        color = obj.str("color"),
        logoSlug = obj.str("logoSlug"),
        customLogoUri = normalizeImportedLogo(obj.str("customLogoUri"), logosDir),
        notes = obj.str("notes"),
        sortIndex = obj.int("sortIndex") ?: index,
        createdAt = obj.str("createdAt") ?: now,
        updatedAt = obj.str("updatedAt") ?: now,
    )
}

private fun normalizeImportedLogo(value: String?, logosDir: File): String? {
    if (value.isNullOrEmpty()) return null
    if (value.startsWith("data:")) {
        return writeCustomLogoFromDataUri(value, logosDir)
    }
    return customLogoFilename(value)
}

private fun narrowSettings(value: JsonElement?): Settings {
    val obj = value as? JsonObject ?: return Settings()
    val theme = when (obj.str("themeMode")) {
        "system" -> ThemeMode.SYSTEM
        "light" -> ThemeMode.LIGHT
        "dark" -> ThemeMode.DARK
        else -> ThemeMode.SYSTEM
    }
    val sort = when (obj.str("sortMode")) {
        "manual" -> SortMode.MANUAL
        "alphabetical" -> SortMode.ALPHABETICAL
        "dateCreated" -> SortMode.DATE_CREATED
        "dateModified" -> SortMode.DATE_MODIFIED
        else -> SortMode.MANUAL
    }
    val language = when (obj.str("language")) {
        "system" -> LanguagePreference.SYSTEM
        "en" -> LanguagePreference.EN
        "it" -> LanguagePreference.IT
        "fr" -> LanguagePreference.FR
        "es" -> LanguagePreference.ES
        "de" -> LanguagePreference.DE
        else -> LanguagePreference.SYSTEM
    }
    return Settings(theme, sort, language)
}

fun detectConflicts(
    existing: Map<String, FidelityCard>,
    imported: List<FidelityCard>,
): Int = imported.count { existing.containsKey(it.id) }

fun mergeCards(
    existing: Map<String, FidelityCard>,
    imported: List<FidelityCard>,
    strategy: MergeStrategy = MergeStrategy.KeepNewer,
): Map<String, FidelityCard> {
    val result = existing.toMutableMap()
    for (card in imported) {
        val ex = result[card.id]
        if (ex == null) {
            result[card.id] = card
        } else {
            when (strategy) {
                MergeStrategy.KeepExisting -> {}
                MergeStrategy.UseImported -> result[card.id] = card
                MergeStrategy.KeepNewer -> {
                    if (isNewer(card.updatedAt, ex.updatedAt)) result[card.id] = card
                }
            }
        }
    }
    return result
}

fun exportJson(
    cards: List<FidelityCard>,
    settings: Settings,
    logosDir: File,
    exportedAt: String = nowIso(),
): String {
    val inlined = cards.map { card ->
        val uri = card.customLogoUri
        if (uri == null) card
        else card.copy(customLogoUri = customLogoToDataUri(uri, logosDir) ?: uri)
    }
    val root = buildJsonObject {
        put("cards", buildJsonArray {
            for (card in inlined) {
                add(buildJsonObject {
                    put("id", JsonPrimitive(card.id))
                    put("name", JsonPrimitive(card.name))
                    put("code", JsonPrimitive(card.code))
                    put("format", JsonPrimitive(card.format.name))
                    card.color?.let { put("color", JsonPrimitive(it)) }
                    card.logoSlug?.let { put("logoSlug", JsonPrimitive(it)) }
                    card.customLogoUri?.let { put("customLogoUri", JsonPrimitive(it)) }
                    card.notes?.let { put("notes", JsonPrimitive(it)) }
                    put("sortIndex", JsonPrimitive(card.sortIndex))
                    put("createdAt", JsonPrimitive(card.createdAt))
                    put("updatedAt", JsonPrimitive(card.updatedAt))
                })
            }
        })
        put("settings", buildJsonObject {
            put(
                "themeMode",
                JsonPrimitive(
                    when (settings.themeMode) {
                        ThemeMode.SYSTEM -> "system"
                        ThemeMode.LIGHT -> "light"
                        ThemeMode.DARK -> "dark"
                    },
                ),
            )
            put(
                "sortMode",
                JsonPrimitive(
                    when (settings.sortMode) {
                        SortMode.MANUAL -> "manual"
                        SortMode.ALPHABETICAL -> "alphabetical"
                        SortMode.DATE_CREATED -> "dateCreated"
                        SortMode.DATE_MODIFIED -> "dateModified"
                    },
                ),
            )
            put(
                "language",
                JsonPrimitive(
                    when (settings.language) {
                        LanguagePreference.SYSTEM -> "system"
                        LanguagePreference.EN -> "en"
                        LanguagePreference.IT -> "it"
                        LanguagePreference.FR -> "fr"
                        LanguagePreference.ES -> "es"
                        LanguagePreference.DE -> "de"
                    },
                ),
            )
        })
        put("exportedAt", JsonPrimitive(exportedAt))
        put("version", JsonPrimitive(EXPORT_VERSION))
    }
    return WalletJson.json.encodeToString(root)
}

fun cardFileName(name: String): String {
    val slug = name.trim().lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')
    return "tesserone-${slug.ifEmpty { "card" }}.json"
}

private fun isNewer(a: String, b: String): Boolean = try {
    Instant.parse(a).isAfter(Instant.parse(b))
} catch (_: Exception) {
    a > b
}
