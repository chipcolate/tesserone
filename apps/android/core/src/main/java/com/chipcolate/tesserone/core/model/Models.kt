package com.chipcolate.tesserone.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.UUID

const val WALLET_SCHEMA_VERSION = 1
const val EXPORT_VERSION = "2.1.0"

@Serializable
enum class BarcodeFormat {
    QR,
    EAN13,
    EAN8,
    CODE128,
    CODE39,
    UPCA,
    UPCE,
    PDF417,
    AZTEC,
    DATAMATRIX,
    ITF14,
}

@Serializable
enum class ThemeMode {
    @SerialName("system") SYSTEM,
    @SerialName("light") LIGHT,
    @SerialName("dark") DARK,
}

@Serializable
enum class SortMode {
    @SerialName("manual") MANUAL,
    @SerialName("alphabetical") ALPHABETICAL,
    @SerialName("dateCreated") DATE_CREATED,
    @SerialName("dateModified") DATE_MODIFIED,
}

@Serializable
enum class LanguagePreference {
    @SerialName("system") SYSTEM,
    @SerialName("en") EN,
    @SerialName("it") IT,
    @SerialName("fr") FR,
    @SerialName("es") ES,
    @SerialName("de") DE,
}

@Serializable
data class FidelityCard(
    val id: String,
    val name: String,
    val code: String,
    val format: BarcodeFormat,
    val color: String? = null,
    val logoSlug: String? = null,
    val customLogoUri: String? = null,
    val notes: String? = null,
    val sortIndex: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class Settings(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val sortMode: SortMode = SortMode.MANUAL,
    val language: LanguagePreference = LanguagePreference.SYSTEM,
)

@Serializable
data class Tutorial(
    val enabled: Boolean = true,
    val seenSteps: Map<String, Boolean> = emptyMap(),
)

@Serializable
data class Wallet(
    val schemaVersion: Int = WALLET_SCHEMA_VERSION,
    val cards: Map<String, FidelityCard> = emptyMap(),
    val settings: Settings = Settings(),
    val tutorial: Tutorial = Tutorial(),
    val migratedFromExpo: Boolean = false,
)

object WalletJson {
    val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
        prettyPrint = true
    }

    fun encode(wallet: Wallet): String = json.encodeToString(wallet)

    fun decode(text: String): Wallet = json.decodeFromString(text)
}

fun nowIso(): String = Instant.now().toString()

fun newCardId(): String {
    val rand = UUID.randomUUID().toString().replace("-", "").take(6)
    return "card-${System.currentTimeMillis()}-$rand"
}

object TutorialStepId {
    const val HOME_ADD_FIRST = "home-add-first"
    const val HOME_TAP_EXPAND = "home-tap-expand"
    const val EXPANDED_TIPS = "expanded-tips"
    const val HOME_SCROLL = "home-scroll"
    const val HOME_SHARE_TIP = "home-share-tip"
    const val HOME_REORDER_HINT = "home-reorder-hint"
    const val REORDER_DRAG = "reorder-drag"

    val ALL: List<String> = listOf(
        HOME_ADD_FIRST,
        HOME_TAP_EXPAND,
        EXPANDED_TIPS,
        HOME_SCROLL,
        HOME_SHARE_TIP,
        HOME_REORDER_HINT,
        REORDER_DRAG,
    )
}

fun nextSortIndex(cards: Map<String, FidelityCard>): Int {
    if (cards.isEmpty()) return 0
    return cards.values.maxOf { it.sortIndex } + 1
}

fun getSortedCards(
    cards: Map<String, FidelityCard>,
    sortMode: SortMode,
): List<FidelityCard> {
    val list = cards.values.toList()
    return when (sortMode) {
        SortMode.MANUAL -> list.sortedBy { it.sortIndex }
        SortMode.ALPHABETICAL -> list.sortedBy { it.name.lowercase() }
        SortMode.DATE_CREATED -> list.sortedByDescending { it.createdAt }
        SortMode.DATE_MODIFIED -> list.sortedByDescending { it.updatedAt }
    }
}
