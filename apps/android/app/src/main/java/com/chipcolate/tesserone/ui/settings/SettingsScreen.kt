package com.chipcolate.tesserone.ui.settings

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipcolate.tesserone.BuildConfig
import com.chipcolate.tesserone.HomeViewModel
import com.chipcolate.tesserone.core.i18n.LANGUAGE_LABELS
import com.chipcolate.tesserone.core.io.ExportData
import com.chipcolate.tesserone.core.io.MergeStrategy
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.ThemeMode
import com.chipcolate.tesserone.ui.components.ActionBar
import com.chipcolate.tesserone.ui.components.BottomSheet
import com.chipcolate.tesserone.ui.components.ButtonVariant
import com.chipcolate.tesserone.ui.components.ConfirmDialog
import com.chipcolate.tesserone.ui.components.Panel
import com.chipcolate.tesserone.ui.components.TesseroneButton
import com.chipcolate.tesserone.ui.i18n.t
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.palette
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen(
    viewModel: HomeViewModel,
    onClose: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val palette = palette()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val strings = com.chipcolate.tesserone.ui.i18n.LocalStrings.current
    val themeMode = viewModel.settings.themeMode
    val language = viewModel.settings.language
    val cardCount = viewModel.cards.size
    var exporting by remember { mutableStateOf(false) }
    var importing by remember { mutableStateOf(false) }
    var languagePicker by remember { mutableStateOf(false) }
    var deleteAll by remember { mutableStateOf(false) }
    var tutorialReset by remember { mutableStateOf(false) }
    var importOk by remember { mutableStateOf<Int?>(null) }
    var pendingImport by remember { mutableStateOf<Pair<ExportData, Int>?>(null) }
    var alertTitle by remember { mutableStateOf<String?>(null) }
    var alertBody by remember { mutableStateOf<String?>(null) }

    BackHandler(onBack = onClose)

    val createDoc = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri: Uri? ->
        if (uri == null) {
            exporting = false
            return@rememberLauncherForActivityResult
        }
        scope.launch {
            try {
                val json = viewModel.exportWalletJson()
                withContext(Dispatchers.IO) {
                    context.contentResolver.openOutputStream(uri)?.use { it.write(json.toByteArray()) }
                }
            } catch (e: Exception) {
                alertTitle = strings.t("settings.exportFailed")
                alertBody = e.message
            } finally {
                exporting = false
            }
        }
    }

    val openDoc = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri: Uri? ->
        if (uri == null) {
            importing = false
            return@rememberLauncherForActivityResult
        }
        scope.launch {
            try {
                val text = withContext(Dispatchers.IO) {
                    context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                }
                if (text == null) {
                    alertTitle = strings.t("settings.importFailed")
                    alertBody = "Could not read file"
                    return@launch
                }
                val preview = viewModel.prepareImport(text)
                if (preview == null) {
                    alertTitle = strings.t("settings.importFailed")
                    alertBody = viewModel.lastImportError ?: "Invalid file format"
                } else if (preview.conflicts == 0) {
                    viewModel.commitImport(preview.data, MergeStrategy.KeepNewer)
                    importOk = preview.data.cards.size
                } else {
                    pendingImport = preview.data to preview.conflicts
                }
            } catch (e: Exception) {
                alertTitle = strings.t("settings.importFailed")
                alertBody = e.message
            } finally {
                importing = false
            }
        }
    }

    fun languageLabel(pref: LanguagePreference): String =
        if (pref == LanguagePreference.SYSTEM) strings.t("settings.languageSystem")
        else LANGUAGE_LABELS[pref] ?: pref.name

    fun themeLabel(mode: ThemeMode): String = when (mode) {
        ThemeMode.SYSTEM -> strings.t("settings.themeSystem")
        ThemeMode.LIGHT -> strings.t("settings.themeLight")
        ThemeMode.DARK -> strings.t("settings.themeDark")
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(modifier = Modifier.fillMaxSize().statusBarsPadding()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        drawLine(
                            color = colors.outline,
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 1.dp.toPx(),
                        )
                    }
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(t("settings.title"), color = colors.onBackground, fontFamily = Mono.bold, fontSize = 18.sp)
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 40.dp),
            ) {
                SectionHeader(t("settings.sectionTheme"))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(ChromeRadius)
                        .background(colors.surface)
                        .border(1.dp, colors.outline, ChromeRadius)
                        .padding(3.dp),
                ) {
                    ThemeMode.entries.forEach { mode ->
                        val on = themeMode == mode
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(ChromeRadius)
                                .background(if (on) Accent else Color.Transparent)
                                .clickable { viewModel.setThemeMode(mode) }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = themeLabel(mode),
                                color = if (on) Color.White else colors.onSurface,
                                fontFamily = if (on) Mono.bold else Mono.regular,
                                fontSize = 14.sp,
                            )
                        }
                    }
                }

                SectionHeader(t("settings.sectionLanguage"))
                Panel {
                    SettingsRow(
                        label = languageLabel(language),
                        trailing = "›",
                        onClick = { languagePicker = true },
                    )
                }

                SectionHeader(t("settings.sectionData"))
                Panel {
                    SettingsRow(
                        label = t("settings.exportCards"),
                        trailing = if (exporting) null else t("settings.cardCount", count = cardCount),
                        loading = exporting,
                        onClick = {
                            exporting = true
                            createDoc.launch("tesserone-export.json")
                        },
                    )
                    Hairline()
                    SettingsRow(
                        label = t("settings.importCards"),
                        loading = importing,
                        onClick = {
                            importing = true
                            openDoc.launch(arrayOf("application/json", "application/octet-stream", "*/*"))
                        },
                    )
                    Hairline()
                    SettingsRow(
                        label = t("settings.replayTutorial"),
                        onClick = {
                            viewModel.resetTutorial()
                            tutorialReset = true
                        },
                    )
                    Hairline()
                    SettingsRow(
                        label = t("settings.deleteAll"),
                        labelColor = palette.danger,
                        onClick = { deleteAll = true },
                    )
                }

                SectionHeader(t("settings.sectionAbout"))
                Panel {
                    SettingsRow(
                        label = "Tesserone",
                        trailing = t("settings.aboutVersion", mapOf("version" to BuildConfig.VERSION_NAME)),
                    )
                    Hairline()
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                        Text(
                            t("settings.aboutTagline"),
                            color = colors.onSurfaceVariant,
                            fontFamily = Mono.regular,
                            fontSize = 12.sp,
                        )
                    }
                    Hairline()
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                        Text(
                            t("settings.aboutDisclaimer"),
                            color = colors.onSurfaceVariant,
                            fontFamily = Mono.regular,
                            fontSize = 12.sp,
                        )
                    }
                }
            }

            ActionBar {
                TesseroneButton(
                    title = t("common.done"),
                    onClick = onClose,
                    variant = ButtonVariant.Primary,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        if (languagePicker) {
            BottomSheet(title = t("settings.sectionLanguage"), onClose = { languagePicker = false }) {
                val prefs = listOf(
                    LanguagePreference.SYSTEM,
                    LanguagePreference.EN,
                    LanguagePreference.IT,
                    LanguagePreference.FR,
                    LanguagePreference.ES,
                    LanguagePreference.DE,
                )
                prefs.forEachIndexed { idx, pref ->
                    if (idx > 0) Hairline()
                    SettingsRow(
                        label = languageLabel(pref),
                        trailing = if (language == pref) "✓" else null,
                        trailingColor = Accent,
                        onClick = {
                            viewModel.setLanguage(pref)
                            languagePicker = false
                        },
                    )
                }
            }
        }

        pendingImport?.let { (data, conflicts) ->
            ConflictDialog(
                count = conflicts,
                onKeepExisting = {
                    viewModel.commitImport(data, MergeStrategy.KeepExisting)
                    importOk = data.cards.size
                    pendingImport = null
                },
                onUseImported = {
                    viewModel.commitImport(data, MergeStrategy.UseImported)
                    importOk = data.cards.size
                    pendingImport = null
                },
                onKeepNewer = {
                    viewModel.commitImport(data, MergeStrategy.KeepNewer)
                    importOk = data.cards.size
                    pendingImport = null
                },
                onCancel = { pendingImport = null },
            )
        }

        if (deleteAll) {
            ConfirmDialog(
                title = t("settings.deleteAllTitle"),
                body = t("settings.deleteAllBody", count = cardCount),
                confirmLabel = t("settings.deleteAllConfirm"),
                cancelLabel = t("common.cancel"),
                destructive = true,
                onConfirm = {
                    viewModel.clearAllCards()
                    deleteAll = false
                },
                onCancel = { deleteAll = false },
            )
        }
        if (tutorialReset) {
            ConfirmDialog(
                title = t("settings.tutorialResetTitle"),
                body = t("settings.tutorialResetBody"),
                confirmLabel = t("common.gotIt"),
                cancelLabel = t("common.cancel"),
                onConfirm = { tutorialReset = false },
                onCancel = { tutorialReset = false },
            )
        }
        importOk?.let { count ->
            ConfirmDialog(
                title = t("settings.importComplete"),
                body = t("settings.importCompleteBody", count = count),
                confirmLabel = t("common.gotIt"),
                cancelLabel = t("common.cancel"),
                onConfirm = { importOk = null },
                onCancel = { importOk = null },
            )
        }
        if (alertTitle != null) {
            ConfirmDialog(
                title = alertTitle!!,
                body = alertBody.orEmpty(),
                confirmLabel = t("common.gotIt"),
                cancelLabel = t("common.cancel"),
                onConfirm = { alertTitle = null; alertBody = null },
                onCancel = { alertTitle = null; alertBody = null },
            )
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    val colors = MaterialTheme.colorScheme
    Text(
        text = text.uppercase(),
        color = colors.onSurfaceVariant,
        fontFamily = Mono.bold,
        fontSize = 13.sp,
        letterSpacing = 0.8.sp,
        modifier = Modifier.padding(top = 24.dp, bottom = 8.dp),
    )
}

@Composable
private fun Hairline() {
    val colors = MaterialTheme.colorScheme
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(colors.outline))
}

@Composable
private fun SettingsRow(
    label: String,
    trailing: String? = null,
    trailingColor: Color? = null,
    labelColor: Color? = null,
    loading: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            color = labelColor ?: colors.onSurface,
            fontFamily = Mono.regular,
            fontSize = 16.sp,
            modifier = Modifier.weight(1f),
        )
        when {
            loading -> CircularProgressIndicator(modifier = Modifier.height(18.dp), strokeWidth = 2.dp, color = colors.onSurfaceVariant)
            trailing != null -> Text(
                text = trailing,
                color = trailingColor ?: colors.onSurfaceVariant,
                fontFamily = Mono.regular,
                fontSize = if (trailing == "✓" || trailing == "›") 16.sp else 12.sp,
            )
        }
    }
}

@Composable
private fun ConflictDialog(
    count: Int,
    onKeepExisting: () -> Unit,
    onUseImported: () -> Unit,
    onKeepNewer: () -> Unit,
    onCancel: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable(onClick = onCancel),
        )
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 24.dp)
                .clip(ChromeRadius)
                .background(colors.surface)
                .border(1.dp, colors.outline, ChromeRadius)
                .padding(20.dp),
        ) {
            Text(t("settings.conflictsFound"), color = colors.onSurface, fontFamily = Mono.bold, fontSize = 16.sp)
            Text(
                t("settings.conflictsFoundBody", count = count),
                color = colors.onSurface,
                fontFamily = Mono.regular,
                fontSize = 14.sp,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )
            TesseroneButton(t("settings.conflictKeepExisting"), onKeepExisting, Modifier.fillMaxWidth())
            Box(Modifier.height(8.dp))
            TesseroneButton(t("settings.conflictUseImported"), onUseImported, Modifier.fillMaxWidth())
            Box(Modifier.height(8.dp))
            TesseroneButton(
                t("settings.conflictKeepNewer"),
                onKeepNewer,
                Modifier.fillMaxWidth(),
                variant = ButtonVariant.Primary,
            )
            Box(Modifier.height(8.dp))
            TesseroneButton(t("common.cancel"), onCancel, Modifier.fillMaxWidth())
        }
    }
}
