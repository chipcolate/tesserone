package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.migrate.ExpoMigrator
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.ThemeMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ZustandUnwrapTest {
    @Test
    fun cardsV2KeepsBareFilename() {
        val cards = ExpoMigrator.unwrapCards(fixture("asyncstorage-cards-v2.json"))
        val card = requireNotNull(cards["card-001"])
        assertEquals("Demo Market", card.name)
        assertEquals(BarcodeFormat.EAN13, card.format)
        assertEquals("1710000000000-abcd1234.jpg", card.customLogoUri)
        assertEquals("4006381333931", card.code)
    }

    @Test
    fun cardsV1CollapsesLegacyFileUri() {
        val cards = ExpoMigrator.unwrapCards(fixture("asyncstorage-cards-v1-legacy-uri.json"))
        val card = requireNotNull(cards["card-001"])
        assertEquals("old.jpg", card.customLogoUri)
    }

    @Test
    fun lowercaseFormatMapsToEan13() {
        val cards = ExpoMigrator.unwrapCards(fixture("asyncstorage-lowercase-format.json"))
        val card = requireNotNull(cards["card-001"])
        assertEquals(BarcodeFormat.EAN13, card.format)
    }

    @Test
    fun settingsV2() {
        val settings = ExpoMigrator.unwrapSettings(fixture("asyncstorage-settings-v2.json"))
        assertEquals(ThemeMode.SYSTEM, settings.themeMode)
        assertEquals(SortMode.MANUAL, settings.sortMode)
        assertEquals(LanguagePreference.SYSTEM, settings.language)
    }

    @Test
    fun settingsV1DefaultsLanguage() {
        val settings = ExpoMigrator.unwrapSettings(
            """{"state":{"themeMode":"dark","sortMode":"alphabetical"},"version":1}""",
        )
        assertEquals(ThemeMode.DARK, settings.themeMode)
        assertEquals(SortMode.ALPHABETICAL, settings.sortMode)
        assertEquals(LanguagePreference.SYSTEM, settings.language)
    }

    @Test
    fun tutorialV1() {
        val tutorial = ExpoMigrator.unwrapTutorial(fixture("asyncstorage-tutorial-v1.json"))
        assertTrue(tutorial.enabled)
        assertTrue(tutorial.seenSteps.isEmpty())
    }
}
