package com.chipcolate.tesserone.core.i18n

import android.content.Context
import com.chipcolate.tesserone.core.model.LanguagePreference
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import java.util.Locale

private val JSON = Json { ignoreUnknownKeys = true }

class Strings(private val tree: JsonObject) {
    fun t(
        key: String,
        vars: Map<String, Any> = emptyMap(),
        count: Int? = null,
    ): String {
        val lookupKey = if (count != null) {
            val suffix = if (count == 1) "_one" else "_other"
            val plural = "$key$suffix"
            if (lookup(plural) != null) plural else key
        } else {
            key
        }
        var text = lookup(lookupKey) ?: key
        val merged = LinkedHashMap<String, Any>(vars)
        if (count != null) merged.putIfAbsent("count", count)
        for ((name, value) in merged) {
            text = text.replace("{{$name}}", value.toString())
        }
        return text
    }

    private fun lookup(key: String): String? {
        var current: Any? = tree
        for (part in key.split('.')) {
            val obj = current as? JsonObject ?: return null
            current = obj[part] ?: return null
        }
        return (current as? JsonPrimitive)?.contentOrNull
    }

    companion object {
        val SUPPORTED: Set<String> = setOf("en", "it", "fr", "es", "de")
        const val DEFAULT = "en"

        fun fromJson(text: String): Strings {
            val el = JSON.parseToJsonElement(text)
            val obj = el as? JsonObject ?: JsonObject(emptyMap())
            return Strings(obj)
        }

        fun fallback(): Strings = Strings(JsonObject(emptyMap()))
    }
}

fun resolveLanguage(
    pref: LanguagePreference,
    systemLanguage: String = Locale.getDefault().language,
): String {
    if (pref != LanguagePreference.SYSTEM) return pref.toCode()
    val primary = systemLanguage.split('-', '_').firstOrNull()?.lowercase(Locale.ROOT).orEmpty()
    return if (primary in Strings.SUPPORTED) primary else Strings.DEFAULT
}

val LANGUAGE_LABELS: Map<LanguagePreference, String> = mapOf(
    LanguagePreference.EN to "English",
    LanguagePreference.IT to "Italiano",
    LanguagePreference.FR to "Français",
    LanguagePreference.ES to "Español",
    LanguagePreference.DE to "Deutsch",
)

fun LanguagePreference.toCode(): String = when (this) {
    LanguagePreference.SYSTEM -> "system"
    LanguagePreference.EN -> "en"
    LanguagePreference.IT -> "it"
    LanguagePreference.FR -> "fr"
    LanguagePreference.ES -> "es"
    LanguagePreference.DE -> "de"
}

fun Context.loadStrings(language: String): Strings {
    val lang = if (language in Strings.SUPPORTED) language else Strings.DEFAULT
    val text = try {
        assets.open("i18n/$lang.json").bufferedReader().use { it.readText() }
    } catch (_: Exception) {
        assets.open("i18n/${Strings.DEFAULT}.json").bufferedReader().use { it.readText() }
    }
    return Strings.fromJson(text)
}
