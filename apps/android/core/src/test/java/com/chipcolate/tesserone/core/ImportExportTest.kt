package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.io.ImportResult
import com.chipcolate.tesserone.core.io.MergeStrategy
import com.chipcolate.tesserone.core.io.detectConflicts
import com.chipcolate.tesserone.core.io.exportJson
import com.chipcolate.tesserone.core.io.mergeCards
import com.chipcolate.tesserone.core.io.parseExport
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.EXPORT_VERSION
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.Settings
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.ThemeMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class ImportExportTest {
    @get:Rule
    val tmp = TemporaryFolder()

    @Test
    fun parseExportV21MaterializesDataUriLogo() {
        val logos = tmp.newFolder("custom-logos")
        val result = parseExport(fixture("export-v2.1.json"), logos)
        val ok = result as ImportResult.Ok
        assertEquals(EXPORT_VERSION, ok.data.version)
        assertEquals(1, ok.data.cards.size)
        val card = ok.data.cards[0]
        assertEquals("card-001", card.id)
        assertEquals(BarcodeFormat.EAN13, card.format)
        assertTrue(card.customLogoUri != null && !card.customLogoUri!!.startsWith("data:"))
        assertTrue(logos.listFiles()!!.any { it.name == card.customLogoUri })
        assertEquals(ThemeMode.SYSTEM, ok.data.settings.themeMode)
        assertEquals(SortMode.MANUAL, ok.data.settings.sortMode)
    }

    @Test
    fun mergeKeepExistingUseImportedKeepNewer() {
        val existing = mapOf(
            "card-001" to card("card-001", "Old", "2026-01-01T00:00:00.000Z"),
        )
        val imported = listOf(
            card("card-001", "New", "2026-06-01T00:00:00.000Z"),
            card("card-002", "Extra", "2026-06-01T00:00:00.000Z"),
        )
        assertEquals(1, detectConflicts(existing, imported))

        val keep = mergeCards(existing, imported, MergeStrategy.KeepExisting)
        assertEquals("Old", keep["card-001"]!!.name)
        assertEquals("Extra", keep["card-002"]!!.name)

        val use = mergeCards(existing, imported, MergeStrategy.UseImported)
        assertEquals("New", use["card-001"]!!.name)

        val newer = mergeCards(existing, imported, MergeStrategy.KeepNewer)
        assertEquals("New", newer["card-001"]!!.name)
    }

    @Test
    fun exportWritesVersion210AndDataUri() {
        val logos = tmp.newFolder("custom-logos")
        val file = java.io.File(logos, "logo.jpg")
        file.writeBytes(byteArrayOf(1, 2, 3, 4))
        val json = exportJson(
            listOf(card("c1", "Shop", "2026-06-17T09:30:00.000Z").copy(customLogoUri = "logo.jpg")),
            Settings(),
            logos,
            exportedAt = "2026-06-17T09:30:00.000Z",
        )
        assertTrue(json.contains("\"version\": \"2.1.0\"") || json.contains("\"version\":\"2.1.0\""))
        assertTrue(json.contains("data:image/jpeg;base64,"))
    }

    @Test
    fun parseRejectsMissingCards() {
        val result = parseExport("""{"version":"2.1.0"}""", tmp.newFolder())
        assertTrue(result is ImportResult.Err)
    }

    private fun card(id: String, name: String, updatedAt: String) = FidelityCard(
        id = id,
        name = name,
        code = "4006381333931",
        format = BarcodeFormat.EAN13,
        sortIndex = 0,
        createdAt = updatedAt,
        updatedAt = updatedAt,
    )
}
