package com.chipcolate.tesserone

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chipcolate.tesserone.core.barcode.ImageBarcodeDetector
import com.chipcolate.tesserone.core.barcode.ImageScanResult
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.i18n.Strings
import com.chipcolate.tesserone.core.i18n.loadStrings
import com.chipcolate.tesserone.core.i18n.resolveLanguage
import com.chipcolate.tesserone.core.io.ExportData
import com.chipcolate.tesserone.core.io.ImportResult
import com.chipcolate.tesserone.core.io.MergeStrategy
import com.chipcolate.tesserone.core.io.detectConflicts
import com.chipcolate.tesserone.core.io.exportJson
import com.chipcolate.tesserone.core.io.mergeCards
import com.chipcolate.tesserone.core.io.parseExport
import com.chipcolate.tesserone.core.migrate.ExpoMigrator
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.Settings
import com.chipcolate.tesserone.core.model.SortMode
import com.chipcolate.tesserone.core.model.ThemeMode
import com.chipcolate.tesserone.core.model.Tutorial
import com.chipcolate.tesserone.core.model.getSortedCards
import com.chipcolate.tesserone.core.model.newCardId
import com.chipcolate.tesserone.core.model.nextSortIndex
import com.chipcolate.tesserone.core.model.nowIso
import com.chipcolate.tesserone.core.store.WalletStore
import com.chipcolate.tesserone.core.store.deleteCustomLogoFile
import com.chipcolate.tesserone.core.store.writeCustomLogoFromStream
import com.chipcolate.tesserone.util.extractExtraStream
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface Screen {
    data object Home : Screen
    data class Add(val sharedImageUri: String? = null) : Screen
    data class Edit(val cardId: String) : Screen
    data object Settings : Screen
}

data class ImportPreview(
    val data: ExportData,
    val conflicts: Int,
)

class HomeViewModel(app: Application) : AndroidViewModel(app) {
    private val store = WalletStore(app.filesDir)
    private val detector = ImageBarcodeDetector(app)
    val brands: BrandIndex = try {
        BrandIndex.fromAssets(app)
    } catch (_: Exception) {
        BrandIndex(emptyList())
    }
    val filesDir: File = app.filesDir

    var cards by mutableStateOf<List<FidelityCard>>(emptyList())
        private set
    var settings by mutableStateOf(Settings())
        private set
    var tutorial by mutableStateOf(Tutorial())
        private set
    var ready by mutableStateOf(false)
        private set
    var pendingOpenId by mutableStateOf<String?>(null)
        private set
    var pendingOpenNonce by mutableLongStateOf(0L)
        private set
    var pendingShareUri by mutableStateOf<String?>(null)
        private set
    var screen by mutableStateOf<Screen>(Screen.Home)
    var strings by mutableStateOf(Strings.fallback())
        private set
    var lastImportError by mutableStateOf<String?>(null)
        private set

    val languageCode: String get() = resolveLanguage(settings.language)

    init {
        viewModelScope.launch {
            ExpoMigrator.migrateIfNeeded(
                store = store,
                filesDir = app.filesDir,
                databasesDir = File(app.applicationInfo.dataDir, "databases"),
            )
            publish()
            ready = true
        }
    }

    private suspend fun publish() {
        val wallet = store.snapshot()
        settings = wallet.settings
        tutorial = wallet.tutorial
        cards = getSortedCards(wallet.cards, wallet.settings.sortMode)
        strings = withContext(Dispatchers.IO) {
            getApplication<Application>().loadStrings(resolveLanguage(wallet.settings.language))
        }
        CompanionSurfaces.onWalletChanged(getApplication())
    }

    fun setSortMode(mode: SortMode) {
        viewModelScope.launch {
            store.setSettings(store.snapshot().settings.copy(sortMode = mode))
            publish()
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch {
            store.setSettings(store.snapshot().settings.copy(themeMode = mode))
            publish()
        }
    }

    fun setLanguage(pref: LanguagePreference) {
        viewModelScope.launch {
            store.setSettings(store.snapshot().settings.copy(language = pref))
            publish()
        }
    }

    fun reorderCards(from: Int, to: Int) {
        val id = cards.getOrNull(from)?.id ?: return
        viewModelScope.launch {
            store.reorderCard(id, to)
            publish()
        }
    }

    fun addCard(
        name: String,
        code: String,
        format: BarcodeFormat,
        color: String?,
        logoSlug: String?,
        customLogoUri: String?,
        notes: String?,
    ) {
        viewModelScope.launch {
            val wallet = store.snapshot()
            val now = nowIso()
            store.addCard(
                FidelityCard(
                    id = newCardId(),
                    name = name,
                    code = code,
                    format = format,
                    color = color,
                    logoSlug = logoSlug,
                    customLogoUri = customLogoUri,
                    notes = notes,
                    sortIndex = nextSortIndex(wallet.cards),
                    createdAt = now,
                    updatedAt = now,
                ),
            )
            publish()
        }
    }

    fun updateCard(
        id: String,
        name: String,
        code: String,
        format: BarcodeFormat,
        color: String?,
        logoSlug: String?,
        customLogoUri: String?,
        notes: String?,
    ) {
        viewModelScope.launch {
            store.updateCard(id) {
                copy(
                    name = name,
                    code = code,
                    format = format,
                    color = color,
                    logoSlug = logoSlug,
                    customLogoUri = customLogoUri,
                    notes = notes,
                )
            }
            publish()
        }
    }

    fun removeCard(id: String) {
        viewModelScope.launch {
            store.removeCard(id)
            publish()
        }
    }

    fun clearAllCards() {
        viewModelScope.launch {
            store.replaceCards(emptyMap())
            publish()
        }
    }

    fun markTutorialSeen(id: String) {
        viewModelScope.launch {
            val next = tutorial.copy(seenSteps = tutorial.seenSteps + (id to true))
            store.setTutorial(next)
            tutorial = next
        }
    }

    fun skipTutorial() {
        viewModelScope.launch {
            val next = tutorial.copy(enabled = false)
            store.setTutorial(next)
            tutorial = next
        }
    }

    fun resetTutorial() {
        viewModelScope.launch {
            val next = Tutorial(enabled = true, seenSteps = emptyMap())
            store.setTutorial(next)
            tutorial = next
        }
    }

    fun copyCustomLogo(uri: Uri): String? {
        val app = getApplication<Application>()
        return try {
            app.contentResolver.openInputStream(uri)?.use { stream ->
                writeCustomLogoFromStream(stream, store.customLogosDir)
            }
        } catch (_: Exception) {
            null
        }
    }

    fun deleteDraftLogo(stored: String?) {
        deleteCustomLogoFile(stored, store.customLogosDir)
    }

    suspend fun detectBarcode(uri: Uri): ImageScanResult = withContext(Dispatchers.IO) {
        detector.detect(uri)
    }

    fun exportWalletJson(): String = exportJson(cards, settings, store.customLogosDir)

    fun exportOneCard(card: FidelityCard): String =
        exportJson(listOf(card), settings, store.customLogosDir)

    fun prepareImport(json: String): ImportPreview? {
        lastImportError = null
        return when (val result = parseExport(json, store.customLogosDir)) {
            is ImportResult.Ok -> ImportPreview(
                data = result.data,
                conflicts = detectConflicts(storeSnapshotCards(), result.data.cards),
            )
            is ImportResult.Err -> {
                lastImportError = result.error
                null
            }
        }
    }

    fun commitImport(data: ExportData, strategy: MergeStrategy) {
        viewModelScope.launch {
            val merged = mergeCards(store.snapshot().cards, data.cards, strategy)
            store.replaceCards(merged)
            publish()
        }
    }

    private fun storeSnapshotCards(): Map<String, FidelityCard> =
        cards.associateBy { it.id }

    fun openAdd(sharedImageUri: String? = null) {
        screen = Screen.Add(sharedImageUri)
    }

    fun openEdit(cardId: String) {
        screen = Screen.Edit(cardId)
    }

    fun openSettings() {
        screen = Screen.Settings
    }

    fun goHome() {
        screen = Screen.Home
    }

    fun consumeIntent(intent: Intent?) {
        if (intent == null) return
        parseOpenCardId(intent.data)?.let { id ->
            pendingOpenId = id
            pendingOpenNonce += 1
            screen = Screen.Home
            return
        }
        if (intent.action == Intent.ACTION_SEND && intent.type?.startsWith("image/") == true) {
            val uri = extractExtraStream(intent) ?: return
            intent.removeExtra(Intent.EXTRA_STREAM)
            intent.action = Intent.ACTION_MAIN
            pendingShareUri = uri.toString()
        }
    }

    fun consumePendingShare(): String? {
        val uri = pendingShareUri
        pendingShareUri = null
        return uri
    }

    fun clearPendingOpen() {
        pendingOpenId = null
    }
}

fun parseOpenCardId(uri: Uri?): String? {
    if (uri == null || uri.scheme != "tesserone") return null
    if (uri.host == "open") {
        return uri.pathSegments.firstOrNull()?.takeIf { it.isNotEmpty() }
    }
    val segs = uri.pathSegments
    if (segs.size >= 2 && segs[0] == "open") return segs[1]
    return null
}
