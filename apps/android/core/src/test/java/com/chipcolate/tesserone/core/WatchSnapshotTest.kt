package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.barcode.isWatchRenderable
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.ThemeMode
import com.chipcolate.tesserone.core.model.WATCH_SCHEMA_VERSION
import com.chipcolate.tesserone.core.model.Wallet
import com.chipcolate.tesserone.core.model.WatchJson
import com.chipcolate.tesserone.core.model.WatchSnapshot
import com.chipcolate.tesserone.core.model.sortedCards
import com.chipcolate.tesserone.core.model.toWatchSnapshot
import com.chipcolate.tesserone.core.wear.WearPaths
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WatchSnapshotTest {
    @Test
    fun schemaVersionIsOne() {
        assertEquals(1, WATCH_SCHEMA_VERSION)
    }

    @Test
    fun roundTripMatchesTsShape() {
        val wallet = Wallet(
            cards = mapOf(
                "card-001" to FidelityCard(
                    id = "card-001",
                    name = "Demo Market",
                    code = "4006381333931",
                    format = BarcodeFormat.EAN13,
                    color = "#42A5F5",
                    logoSlug = "esselunga",
                    customLogoUri = null,
                    sortIndex = 0,
                    createdAt = "2026-06-17T09:30:00.000Z",
                    updatedAt = "2026-06-17T09:30:00.000Z",
                ),
            ),
        )
        val snap = wallet.toWatchSnapshot()
        val json = WatchJson.encode(snap)
        val decoded = WatchJson.decode(json)
        assertEquals(1, decoded.schemaVersion)
        assertEquals("card-001", decoded.cards.single().id)
        assertEquals(BarcodeFormat.EAN13, decoded.cards.single().format)
        assertEquals("bundled:esselunga", decoded.cards.single().logoKey)
        assertEquals(SortMode.MANUAL, decoded.sortMode)
        assertEquals(ThemeMode.SYSTEM, decoded.themeMode)
        assertTrue(json.contains("\"schemaVersion\":1"))
        assertTrue(json.contains("\"hasCustomLogo\":false"))
        assertTrue(json.contains("\"sortMode\":\"manual\""))
        assertTrue(json.contains("\"themeMode\":\"system\""))
        assertTrue(json.contains("\"format\":\"EAN13\""))
    }

    @Test
    fun customLogoKeyAndSort() {
        val snap = WatchSnapshot(
            cards = listOf(
                card("b", "Beta", 1, "2026-01-01T00:00:00.000Z"),
                card("a", "Alpha", 0, "2026-01-02T00:00:00.000Z", custom = true),
            ),
            sortMode = SortMode.DATE_CREATED,
        )
        assertEquals("custom:a", snap.cards.first { it.id == "a" }.logoKey)
        assertEquals(listOf("a", "b"), snap.sortedCards().map { it.id })
    }

    @Test
    fun watchRenderableFormatsMatchAppleWatch() {
        val supported = setOf(
            BarcodeFormat.QR,
            BarcodeFormat.EAN13,
            BarcodeFormat.EAN8,
            BarcodeFormat.CODE128,
            BarcodeFormat.CODE39,
            BarcodeFormat.UPCA,
            BarcodeFormat.ITF14,
        )
        for (format in BarcodeFormat.entries) {
            assertEquals(format in supported, format.isWatchRenderable())
        }
        assertFalse(BarcodeFormat.UPCE.isWatchRenderable())
        assertFalse(BarcodeFormat.AZTEC.isWatchRenderable())
    }

    @Test
    fun wearLogoPathRoundTrip() {
        val key = "custom:card-001"
        val path = WearPaths.logoPath(key)
        assertTrue(path.startsWith(WearPaths.LOGO_PREFIX))
        assertEquals(key, WearPaths.logoKeyFromPath(path))
        assertEquals(null, WearPaths.logoKeyFromPath(WearPaths.SNAPSHOT))
    }

    private fun card(
        id: String,
        name: String,
        sort: Int,
        created: String,
        custom: Boolean = false,
    ) = com.chipcolate.tesserone.core.model.WatchSnapshotCard(
        id = id,
        name = name,
        code = "123",
        format = BarcodeFormat.CODE128,
        hasCustomLogo = custom,
        sortIndex = sort,
        createdAt = created,
        updatedAt = created,
    )
}
