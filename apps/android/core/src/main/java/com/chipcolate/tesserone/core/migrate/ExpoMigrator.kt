package com.chipcolate.tesserone.core.migrate

import android.database.sqlite.SQLiteDatabase
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.Settings
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.ThemeMode
import com.chipcolate.tesserone.core.model.Tutorial
import com.chipcolate.tesserone.core.model.WALLET_SCHEMA_VERSION
import com.chipcolate.tesserone.core.model.Wallet
import com.chipcolate.tesserone.core.model.WalletJson
import com.chipcolate.tesserone.core.model.customLogoFilename
import com.chipcolate.tesserone.core.model.normalizeFormat
import com.chipcolate.tesserone.core.model.nowIso
import com.chipcolate.tesserone.core.store.WalletStore
import com.chipcolate.tesserone.core.store.copyExpoCustomLogos
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

object ExpoMigrator {
    /**
     * Reads Expo AsyncStorage (`RKStorage` / `catalystLocalStorage`) into the
     * native wallet. Skips when the native store already has cards. Does not
     * delete RKStorage.
     */
    suspend fun migrateIfNeeded(
        store: WalletStore,
        filesDir: File,
        databasesDir: File,
    ): Boolean {
        val current = store.load()
        if (current.cards.isNotEmpty()) return false
        val keys = readRkStorage(databasesDir) ?: return false
        return migrateFromZustand(store, keys["cards"], keys["settings"], keys["tutorial"], filesDir)
    }

    suspend fun migrateFromZustand(
        store: WalletStore,
        cardsJson: String?,
        settingsJson: String?,
        tutorialJson: String?,
        filesDir: File,
    ): Boolean {
        val current = store.load()
        if (current.cards.isNotEmpty()) return false
        if (cardsJson == null && settingsJson == null && tutorialJson == null) return false

        val cards = cardsJson?.let { unwrapCards(it) } ?: emptyMap()
        val settings = settingsJson?.let { unwrapSettings(it) } ?: Settings()
        val tutorial = tutorialJson?.let { unwrapTutorial(it) } ?: Tutorial()

        store.replaceWallet(
            Wallet(
                schemaVersion = WALLET_SCHEMA_VERSION,
                cards = cards,
                settings = settings,
                tutorial = tutorial,
                migratedFromExpo = true,
            ),
        )
        copyExpoCustomLogos(filesDir)
        return true
    }

    fun unwrapCards(jsonText: String): Map<String, FidelityCard> {
        val state = unwrapState(jsonText) ?: return emptyMap()
        val cardsEl = state["cards"] as? JsonObject ?: return emptyMap()
        val out = LinkedHashMap<String, FidelityCard>()
        var index = 0
        for ((id, el) in cardsEl) {
            val obj = el as? JsonObject ?: continue
            migrateRawCard(obj, index)?.let { out[id] = it }
            index += 1
        }
        return out
    }

    fun unwrapSettings(jsonText: String): Settings {
        val state = unwrapState(jsonText) ?: return Settings()
        val theme = when (state.str("themeMode")) {
            "light" -> ThemeMode.LIGHT
            "dark" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
        val sort = when (state.str("sortMode")) {
            "alphabetical" -> SortMode.ALPHABETICAL
            "dateCreated" -> SortMode.DATE_CREATED
            "dateModified" -> SortMode.DATE_MODIFIED
            else -> SortMode.MANUAL
        }
        val language = when (state.str("language")) {
            "en" -> LanguagePreference.EN
            "it" -> LanguagePreference.IT
            "fr" -> LanguagePreference.FR
            "es" -> LanguagePreference.ES
            "de" -> LanguagePreference.DE
            else -> LanguagePreference.SYSTEM
        }
        return Settings(theme, sort, language)
    }

    fun unwrapTutorial(jsonText: String): Tutorial {
        val state = unwrapState(jsonText) ?: return Tutorial()
        val enabled = state["enabled"]?.jsonPrimitive?.booleanOrNull ?: true
        val seen = (state["seenSteps"] as? JsonObject)?.mapValues { (_, v) ->
            v.jsonPrimitive.booleanOrNull ?: false
        } ?: emptyMap()
        return Tutorial(enabled = enabled, seenSteps = seen)
    }

    fun readRkStorage(databasesDir: File): Map<String, String>? {
        val dbFile = findRkStorage(databasesDir) ?: return null
        val db = try {
            SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
        } catch (_: Exception) {
            return null
        }
        return try {
            val out = LinkedHashMap<String, String>()
            db.query(
                "catalystLocalStorage",
                arrayOf("key", "value"),
                null, null, null, null, null,
            ).use { cursor ->
                val keyIdx = cursor.getColumnIndex("key")
                val valIdx = cursor.getColumnIndex("value")
                while (cursor.moveToNext()) {
                    val k = cursor.getString(keyIdx) ?: continue
                    val v = cursor.getString(valIdx) ?: continue
                    out[k] = v
                }
            }
            out
        } catch (_: Exception) {
            null
        } finally {
            db.close()
        }
    }

    fun findRkStorage(databasesDir: File): File? {
        val candidates = listOf(
            File(databasesDir, "RKStorage"),
            File(databasesDir, "RKStorage.db"),
        )
        return candidates.firstOrNull { it.isFile }
    }

    private fun unwrapState(jsonText: String): JsonObject? {
        val root = try {
            WalletJson.json.parseToJsonElement(jsonText)
        } catch (_: Exception) {
            return null
        } as? JsonObject ?: return null
        return (root["state"] as? JsonObject) ?: root
    }

    private fun migrateRawCard(obj: JsonObject, index: Int): FidelityCard? {
        val id = obj.str("id") ?: return null
        val name = obj.str("name") ?: return null
        val code = obj.str("code") ?: return null
        val format = obj.str("format") ?: return null
        val now = nowIso()
        return FidelityCard(
            id = id,
            name = name,
            code = code,
            format = normalizeFormat(format),
            color = obj.str("color"),
            logoSlug = obj.str("logoSlug"),
            customLogoUri = customLogoFilename(obj.str("customLogoUri")),
            notes = obj.str("notes"),
            sortIndex = obj.int("sortIndex") ?: index,
            createdAt = obj.str("createdAt") ?: now,
            updatedAt = obj.str("updatedAt") ?: now,
        )
    }

    private fun JsonObject.str(key: String): String? =
        this[key]?.jsonPrimitive?.contentOrNull

    private fun JsonObject.int(key: String): Int? =
        this[key]?.jsonPrimitive?.intOrNull
}
