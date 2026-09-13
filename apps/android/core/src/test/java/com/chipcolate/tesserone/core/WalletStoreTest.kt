package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.Wallet
import com.chipcolate.tesserone.core.model.WalletJson
import com.chipcolate.tesserone.core.model.getSortedCards
import com.chipcolate.tesserone.core.store.WalletStore
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class WalletStoreTest {
    @get:Rule
    val tmp = TemporaryFolder()

    @Test
    fun loadMissingFileReturnsEmptyDefaults() = runBlocking {
        val store = WalletStore(tmp.root)
        val wallet = store.load()
        assertTrue(wallet.cards.isEmpty())
        assertEquals(SortMode.MANUAL, wallet.settings.sortMode)
        assertTrue(wallet.tutorial.enabled)
        assertFalse(wallet.migratedFromExpo)
    }

    @Test
    fun roundTripNativeOneCard() = runBlocking {
        val store = WalletStore(tmp.root)
        val decoded = WalletJson.decode(fixture("native-one-card.json"))
        store.replaceWallet(decoded)
        val loaded = WalletStore(tmp.root).load()
        assertEquals(1, loaded.cards.size)
        assertEquals("Demo Market", loaded.cards["card-001"]!!.name)
        assertEquals(BarcodeFormat.EAN13, loaded.cards["card-001"]!!.format)
        assertTrue(store.walletFile.isFile)
        assertEquals("store/wallet.json", store.walletFile.relativeTo(tmp.root).invariantSeparatorsPath)
    }

    @Test
    fun crudAndReorder() = runBlocking {
        val store = WalletStore(tmp.root)
        store.addCard(card("a", "Alpha", 0))
        store.addCard(card("b", "Beta", 1))
        store.addCard(card("c", "Gamma", 2))
        store.reorderCard("c", 0)
        val sorted = store.sortedCards()
        assertEquals(listOf("c", "a", "b"), sorted.map { it.id })
        store.updateCard("a") { copy(name = "Al") }
        assertEquals("Al", store.snapshot().cards["a"]!!.name)
        store.removeCard("b")
        assertEquals(2, store.snapshot().cards.size)
    }

    @Test
    fun decodeNativeEmpty() {
        val wallet: Wallet = WalletJson.decode(fixture("native-empty.json"))
        assertTrue(wallet.cards.isEmpty())
        assertEquals(1, wallet.schemaVersion)
    }

    @Test
    fun sortModes() {
        val cards = mapOf(
            "b" to card("b", "Beta", 1, created = "2026-01-02T00:00:00.000Z"),
            "a" to card("a", "Alpha", 0, created = "2026-01-01T00:00:00.000Z"),
        )
        assertEquals(listOf("a", "b"), getSortedCards(cards, SortMode.MANUAL).map { it.id })
        assertEquals(listOf("a", "b"), getSortedCards(cards, SortMode.ALPHABETICAL).map { it.id })
        assertEquals(listOf("b", "a"), getSortedCards(cards, SortMode.DATE_CREATED).map { it.id })
    }

    private fun card(
        id: String,
        name: String,
        sortIndex: Int,
        created: String = "2026-06-17T09:30:00.000Z",
    ) = FidelityCard(
        id = id,
        name = name,
        code = "4006381333931",
        format = BarcodeFormat.EAN13,
        sortIndex = sortIndex,
        createdAt = created,
        updatedAt = created,
    )
}
