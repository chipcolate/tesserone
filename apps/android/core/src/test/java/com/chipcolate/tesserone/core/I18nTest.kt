package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.i18n.Strings
import com.chipcolate.tesserone.core.i18n.resolveLanguage
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.TutorialStepId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class I18nTest {
    private val sample = Strings.fromJson(
        """
        {
          "common": { "cancel": "Cancel", "save": "Save" },
          "add": { "invalidBarcodeBody": "The code doesn't match the {{format}} format." },
          "home": {
            "cardCount_one": "{{count}} card",
            "cardCount_other": "{{count}} cards"
          }
        }
        """.trimIndent(),
    )

    @Test
    fun nestedKey() {
        assertEquals("Cancel", sample.t("common.cancel"))
        assertEquals("Save", sample.t("common.save"))
    }

    @Test
    fun interpolatesMustacheVars() {
        assertEquals(
            "The code doesn't match the EAN-13 format.",
            sample.t("add.invalidBarcodeBody", mapOf("format" to "EAN-13")),
        )
    }

    @Test
    fun pluralOneOther() {
        assertEquals("1 card", sample.t("home.cardCount", count = 1))
        assertEquals("0 cards", sample.t("home.cardCount", count = 0))
        assertEquals("3 cards", sample.t("home.cardCount", count = 3))
    }

    @Test
    fun missingKeyReturnsKey() {
        assertEquals("no.such.key", sample.t("no.such.key"))
    }

    @Test
    fun resolveLanguageFromPreferenceAndSystem() {
        assertEquals("en", resolveLanguage(LanguagePreference.EN, "it"))
        assertEquals("it", resolveLanguage(LanguagePreference.SYSTEM, "it-IT"))
        assertEquals("de", resolveLanguage(LanguagePreference.SYSTEM, "de"))
        assertEquals("en", resolveLanguage(LanguagePreference.SYSTEM, "ja-JP"))
        assertEquals("en", resolveLanguage(LanguagePreference.SYSTEM, ""))
    }

    @Test
    fun tutorialHasSevenStepIds() {
        assertEquals(7, TutorialStepId.ALL.size)
        assertEquals("home-add-first", TutorialStepId.ALL.first())
        assertEquals("reorder-drag", TutorialStepId.ALL.last())
    }

    @Test
    fun loadsCanonicalEnJson() {
        val text = javaClass.classLoader!!
            .getResourceAsStream("i18n/en.json")!!
            .bufferedReader()
            .use { it.readText() }
        val en = Strings.fromJson(text)
        assertEquals("Add Card", en.t("home.addCard"))
        assertEquals("1 card", en.t("home.cardCount", count = 1))
        assertEquals("4 cards", en.t("settings.cardCount", count = 4))
        assertFalse(en.t("settings.aboutTagline").isBlank())
        assertEquals("Add a card in Tesserone", en.t("widget.empty"))
        assertEquals("Tesserone Card", en.t("widget.singleLabel"))
        assertEquals("Tesserone Cards", en.t("widget.listLabel"))
    }
}
