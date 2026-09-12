package com.chipcolate.tesserone.core.store

import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.Settings
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.Tutorial
import com.chipcolate.tesserone.core.model.WALLET_SCHEMA_VERSION
import com.chipcolate.tesserone.core.model.Wallet
import com.chipcolate.tesserone.core.model.WalletJson
import com.chipcolate.tesserone.core.model.getSortedCards
import com.chipcolate.tesserone.core.model.nowIso
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.io.FileOutputStream

object WalletPaths {
    const val STORE_DIR = "store"
    const val WALLET_FILE = "wallet.json"
    const val CUSTOM_LOGOS_DIR = "custom-logos"

    fun walletFile(filesDir: File): File = File(filesDir, "$STORE_DIR/$WALLET_FILE")

    fun customLogosDir(filesDir: File): File = File(filesDir, CUSTOM_LOGOS_DIR)

    /** Expo `Paths.document` is `files/` or `files/Documents` on Android. */
    fun expoCustomLogoDirs(filesDir: File): List<File> = listOf(
        File(filesDir, CUSTOM_LOGOS_DIR),
        File(filesDir, "Documents/$CUSTOM_LOGOS_DIR"),
    )
}

internal fun atomicWrite(file: File, bytes: ByteArray) {
    val parent = file.parentFile ?: error("wallet file has no parent")
    parent.mkdirs()
    val tmp = File(parent, "${file.name}.tmp")
    FileOutputStream(tmp).use { out ->
        out.write(bytes)
        out.flush()
        out.fd.sync()
    }
    if (tmp.renameTo(file)) return
    if (file.exists()) file.delete()
    if (!tmp.renameTo(file)) {
        tmp.copyTo(file, overwrite = true)
        tmp.delete()
    }
}

class WalletStore(val filesDir: File) {
    private val mutex = Mutex()
    private var loaded = false
    private var wallet = Wallet()

    val walletFile: File get() = WalletPaths.walletFile(filesDir)
    val customLogosDir: File get() = WalletPaths.customLogosDir(filesDir)

    suspend fun load(): Wallet = mutex.withLock { loadLocked() }

    suspend fun snapshot(): Wallet = mutex.withLock {
        loadLocked()
        wallet
    }

    suspend fun save() = mutex.withLock {
        loadLocked()
        saveLocked()
    }

    suspend fun replaceWallet(next: Wallet): Wallet = mutex.withLock {
        wallet = next.copy(schemaVersion = WALLET_SCHEMA_VERSION)
        loaded = true
        saveLocked()
        wallet
    }

    suspend fun addCard(card: FidelityCard): FidelityCard = mutex.withLock {
        loadLocked()
        wallet = wallet.copy(cards = wallet.cards + (card.id to card))
        saveLocked()
        card
    }

    suspend fun updateCard(id: String, patch: FidelityCard.() -> FidelityCard): FidelityCard? =
        mutex.withLock {
            loadLocked()
            val existing = wallet.cards[id] ?: return@withLock null
            val updated = existing.patch().copy(id = id, updatedAt = nowIso())
            wallet = wallet.copy(cards = wallet.cards + (id to updated))
            saveLocked()
            updated
        }

    suspend fun removeCard(id: String): Boolean = mutex.withLock {
        loadLocked()
        if (!wallet.cards.containsKey(id)) return@withLock false
        wallet = wallet.copy(cards = wallet.cards - id)
        saveLocked()
        true
    }

    suspend fun reorderCard(id: String, newIndex: Int): Wallet = mutex.withLock {
        loadLocked()
        val list = getSortedCards(wallet.cards, SortMode.MANUAL).toMutableList()
        val oldIdx = list.indexOfFirst { it.id == id }
        if (oldIdx == -1) return@withLock wallet
        val moved = list.removeAt(oldIdx)
        val clamped = newIndex.coerceIn(0, list.size)
        list.add(clamped, moved)
        val updated = list.mapIndexed { i, card -> card.id to card.copy(sortIndex = i) }.toMap()
        wallet = wallet.copy(cards = updated)
        saveLocked()
        wallet
    }

    suspend fun setSettings(settings: Settings): Wallet = mutex.withLock {
        loadLocked()
        wallet = wallet.copy(settings = settings)
        saveLocked()
        wallet
    }

    suspend fun setTutorial(tutorial: Tutorial): Wallet = mutex.withLock {
        loadLocked()
        wallet = wallet.copy(tutorial = tutorial)
        saveLocked()
        wallet
    }

    suspend fun replaceCards(cards: Map<String, FidelityCard>): Wallet = mutex.withLock {
        loadLocked()
        wallet = wallet.copy(cards = cards)
        saveLocked()
        wallet
    }

    suspend fun sortedCards(): List<FidelityCard> = mutex.withLock {
        loadLocked()
        getSortedCards(wallet.cards, wallet.settings.sortMode)
    }

    private fun loadLocked(): Wallet {
        if (loaded) return wallet
        wallet = if (walletFile.isFile) {
            WalletJson.decode(walletFile.readText())
        } else {
            Wallet()
        }
        loaded = true
        return wallet
    }

    private fun saveLocked() {
        atomicWrite(walletFile, WalletJson.encode(wallet).toByteArray(Charsets.UTF_8))
    }
}
