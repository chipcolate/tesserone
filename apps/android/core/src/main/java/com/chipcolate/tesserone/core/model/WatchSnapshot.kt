package com.chipcolate.tesserone.core.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/** Wire contract with the Expo/iOS watch companion (`WATCH_SCHEMA_VERSION` in `src/types.ts`). */
const val WATCH_SCHEMA_VERSION = 1

@Serializable
data class WatchSnapshotCard(
    val id: String,
    val name: String,
    val code: String,
    val format: BarcodeFormat,
    val color: String? = null,
    val logoSlug: String? = null,
    val hasCustomLogo: Boolean,
    val sortIndex: Int,
    val createdAt: String,
    val updatedAt: String,
) {
    val logoKey: String?
        get() = when {
            hasCustomLogo -> "custom:$id"
            !logoSlug.isNullOrBlank() -> "bundled:$logoSlug"
            else -> null
        }
}

@Serializable
data class WatchSnapshot(
    val schemaVersion: Int = WATCH_SCHEMA_VERSION,
    val cards: List<WatchSnapshotCard> = emptyList(),
    val sortMode: SortMode = SortMode.MANUAL,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
)

object WatchJson {
    val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
    }

    fun encode(snapshot: WatchSnapshot): String = json.encodeToString(snapshot)

    fun decode(text: String): WatchSnapshot = json.decodeFromString(text)
}

fun FidelityCard.toWatchSnapshotCard(): WatchSnapshotCard = WatchSnapshotCard(
    id = id,
    name = name,
    code = code,
    format = format,
    color = color,
    logoSlug = logoSlug,
    hasCustomLogo = customLogoFilename(customLogoUri) != null,
    sortIndex = sortIndex,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun Wallet.toWatchSnapshot(): WatchSnapshot = WatchSnapshot(
    schemaVersion = WATCH_SCHEMA_VERSION,
    cards = cards.values.sortedBy { it.id }.map { it.toWatchSnapshotCard() },
    sortMode = settings.sortMode,
    themeMode = settings.themeMode,
)

fun WatchSnapshot.sortedCards(): List<WatchSnapshotCard> = when (sortMode) {
    SortMode.MANUAL -> cards.sortedBy { it.sortIndex }
    SortMode.ALPHABETICAL -> cards.sortedBy { it.name.lowercase() }
    SortMode.DATE_CREATED -> cards.sortedByDescending { it.createdAt }
    SortMode.DATE_MODIFIED -> cards.sortedByDescending { it.updatedAt }
}
