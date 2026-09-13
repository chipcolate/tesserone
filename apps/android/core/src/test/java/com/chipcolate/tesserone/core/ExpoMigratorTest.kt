package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.migrate.ExpoMigrator
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.store.WalletStore
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class ExpoMigratorTest {
    @get:Rule
    val tmp = TemporaryFolder()

    @Test
    fun migratesZustandBlobsAndCopiesDocumentsLogos() = runBlocking {
        val filesDir = tmp.root
        val expoLogos = File(filesDir, "Documents/custom-logos").apply { mkdirs() }
        File(expoLogos, "old.jpg").writeText("logo")

        val store = WalletStore(filesDir)
        val did = ExpoMigrator.migrateFromZustand(
            store,
            fixture("asyncstorage-cards-v1-legacy-uri.json"),
            fixture("asyncstorage-settings-v2.json"),
            fixture("asyncstorage-tutorial-v1.json"),
            filesDir,
        )
        assertTrue(did)
        val wallet = store.load()
        assertTrue(wallet.migratedFromExpo)
        assertEquals("old.jpg", wallet.cards["card-001"]!!.customLogoUri)
        assertEquals(BarcodeFormat.EAN13, wallet.cards["card-001"]!!.format)
        assertTrue(File(filesDir, "custom-logos/old.jpg").isFile)
    }

    @Test
    fun skipsWhenNativeStoreAlreadyHasCards() = runBlocking {
        val filesDir = tmp.root
        val store = WalletStore(filesDir)
        store.addCard(
            FidelityCard(
                id = "keep",
                name = "Keep",
                code = "1",
                format = BarcodeFormat.CODE128,
                sortIndex = 0,
                createdAt = "2026-01-01T00:00:00.000Z",
                updatedAt = "2026-01-01T00:00:00.000Z",
            ),
        )
        val did = ExpoMigrator.migrateFromZustand(
            store,
            fixture("asyncstorage-cards-v2.json"),
            fixture("asyncstorage-settings-v2.json"),
            fixture("asyncstorage-tutorial-v1.json"),
            filesDir,
        )
        assertFalse(did)
        assertEquals(setOf("keep"), store.load().cards.keys)
    }
}
