package com.chipcolate.tesserone.ui.add

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.view.HapticFeedbackConstants
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.chipcolate.tesserone.HomeViewModel
import com.chipcolate.tesserone.core.barcode.ImageScanResult
import com.chipcolate.tesserone.core.barcode.validateBarcode
import com.chipcolate.tesserone.core.brands.BrandEntry
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.ui.components.ActionBar
import com.chipcolate.tesserone.ui.components.AppSnackbar
import com.chipcolate.tesserone.ui.components.BrandResultList
import com.chipcolate.tesserone.ui.components.ButtonVariant
import com.chipcolate.tesserone.ui.components.ColorGrid
import com.chipcolate.tesserone.ui.components.ConfirmDialog
import com.chipcolate.tesserone.ui.components.FormatChips
import com.chipcolate.tesserone.ui.components.LogoSelector
import com.chipcolate.tesserone.ui.components.SectionLabel
import com.chipcolate.tesserone.ui.components.TesseroneButton
import com.chipcolate.tesserone.ui.components.TesseroneField
import com.chipcolate.tesserone.ui.i18n.t
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.DefaultCardColor
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.wallet.CardBack
import com.chipcolate.tesserone.ui.wallet.CardFace
import com.chipcolate.tesserone.util.openAppSettings
import java.io.File
import kotlinx.coroutines.launch

private enum class WizardStep { Barcode, Brand, Finish }

private enum class ScanStatus { Idle, Scanning, NotFound }

@Composable
fun AddWizardScreen(
    viewModel: HomeViewModel,
    sharedImageUri: String?,
    onClose: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val context = LocalContext.current
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    val strings = com.chipcolate.tesserone.ui.i18n.LocalStrings.current
    var step by remember { mutableStateOf(WizardStep.Barcode) }
    var cameraOpen by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var format by remember { mutableStateOf(BarcodeFormat.EAN13) }
    var color by remember { mutableStateOf(DefaultCardColor) }
    var notes by remember { mutableStateOf("") }
    var logoSlug by remember { mutableStateOf<String?>(null) }
    var customLogoUri by remember { mutableStateOf<String?>(null) }
    var scanStatus by remember { mutableStateOf(ScanStatus.Idle) }
    var pickedImageUri by remember { mutableStateOf<String?>(null) }
    var snackbar by remember { mutableStateOf<Pair<String, String?>?>(null) }
    var invalidDialog by remember { mutableStateOf(false) }
    var manualOpen by remember { mutableStateOf(false) }
    var sharedHandled by remember { mutableStateOf(false) }

    fun haptic() {
        view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
    }

    fun applyScan(scannedCode: String, scannedFormat: BarcodeFormat) {
        code = scannedCode
        format = scannedFormat
        scanStatus = ScanStatus.Idle
        pickedImageUri = null
        haptic()
    }

    fun scanUri(uri: Uri) {
        pickedImageUri = uri.toString()
        scanStatus = ScanStatus.Scanning
        scope.launch {
            when (val result = viewModel.detectBarcode(uri)) {
                is ImageScanResult.Detected -> applyScan(result.code.code, result.code.format)
                ImageScanResult.NotFound -> scanStatus = ScanStatus.NotFound
                ImageScanResult.Error -> {
                    scanStatus = ScanStatus.Idle
                    pickedImageUri = null
                    snackbar = strings.t("add.scanErrorTitle") + " — " + strings.t("add.scanErrorBody") to null
                }
            }
        }
    }

    LaunchedEffect(sharedImageUri) {
        if (sharedHandled) return@LaunchedEffect
        val raw = sharedImageUri ?: return@LaunchedEffect
        sharedHandled = true
        scanUri(Uri.parse(raw))
    }

    val cameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) cameraOpen = true
        else snackbar = strings.t("add.cameraPermissionBlockedBody") to strings.t("common.openSettings")
    }

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) scanUri(uri)
    }

    val canAdvance = when (step) {
        WizardStep.Barcode -> code.trim().isNotEmpty()
        WizardStep.Brand -> name.trim().isNotEmpty()
        WizardStep.Finish -> true
    }

    fun goBack() {
        when (step) {
            WizardStep.Barcode -> if (cameraOpen) cameraOpen = false else onClose()
            WizardStep.Brand -> step = WizardStep.Barcode
            WizardStep.Finish -> step = WizardStep.Brand
        }
    }

    fun goNext() {
        when (step) {
            WizardStep.Barcode -> {
                if (!validateBarcode(code.trim(), format)) {
                    invalidDialog = true
                    return
                }
                step = WizardStep.Brand
            }
            WizardStep.Brand -> step = WizardStep.Finish
            WizardStep.Finish -> {
                viewModel.addCard(
                    name = name.trim(),
                    code = code.trim(),
                    format = format,
                    color = color,
                    logoSlug = logoSlug,
                    customLogoUri = customLogoUri,
                    notes = notes.trim().ifEmpty { null },
                )
                haptic()
                onClose()
            }
        }
    }

    BackHandler { goBack() }

    val stepIndex = WizardStep.entries.indexOf(step)
    val title = when (step) {
        WizardStep.Barcode -> t("add.stepBarcodeTitle")
        WizardStep.Brand -> t("add.stepBrandTitle")
        WizardStep.Finish -> t("add.stepReviewTitle")
    }
    val subtitle = when (step) {
        WizardStep.Barcode -> t("add.stepBarcodeSubtitle")
        WizardStep.Brand -> t("add.stepBrandSubtitle")
        WizardStep.Finish -> t("add.stepReviewSubtitle")
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(modifier = Modifier.fillMaxSize().statusBarsPadding()) {
            WizardProgress(stepIndex = stepIndex, total = 3, title = title, subtitle = subtitle)
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                when (step) {
                    WizardStep.Barcode -> StepBarcode(
                        code = code,
                        format = format,
                        onCodeChange = { code = it },
                        onFormatChange = { format = it },
                        scanStatus = scanStatus,
                        pickedImageUri = pickedImageUri,
                        showEntry = manualOpen || code.isNotEmpty(),
                        onScan = {
                            val granted = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.CAMERA,
                            ) == PackageManager.PERMISSION_GRANTED
                            if (granted) cameraOpen = true
                            else cameraPermission.launch(Manifest.permission.CAMERA)
                        },
                        onPhoto = {
                            photoPicker.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                            )
                        },
                        onType = { manualOpen = true },
                    )
                    WizardStep.Brand -> StepBrand(
                        name = name,
                        logoSlug = logoSlug,
                        customLogoUri = customLogoUri,
                        color = color,
                        brands = viewModel.brands,
                        filesDir = viewModel.filesDir,
                        onNameChange = { name = it },
                        onBrandSelect = { brand ->
                            name = brand.name
                            logoSlug = brand.slug
                            if (customLogoUri != null) {
                                viewModel.deleteDraftLogo(customLogoUri)
                                customLogoUri = null
                            }
                            if (brand.primaryColor.isNotBlank()) color = brand.primaryColor
                        },
                        onCustomLogoPick = { uri ->
                            val filename = viewModel.copyCustomLogo(uri)
                            if (filename != null) {
                                if (customLogoUri != null && customLogoUri != filename) {
                                    viewModel.deleteDraftLogo(customLogoUri)
                                }
                                customLogoUri = filename
                                logoSlug = null
                            }
                        },
                        onClearLogo = {
                            logoSlug = null
                            if (customLogoUri != null) {
                                viewModel.deleteDraftLogo(customLogoUri)
                                customLogoUri = null
                            }
                        },
                    )
                    WizardStep.Finish -> StepFinish(
                        previewCard = FidelityCard(
                            id = "preview",
                            name = name.trim().ifEmpty { t("card.previewPlaceholder") },
                            code = code.trim(),
                            format = format,
                            color = color,
                            logoSlug = logoSlug,
                            customLogoUri = customLogoUri,
                            notes = notes.trim().ifEmpty { null },
                            sortIndex = 0,
                            createdAt = "",
                            updatedAt = "",
                        ),
                        color = color,
                        notes = notes,
                        brands = viewModel.brands,
                        filesDir = viewModel.filesDir,
                        onColorChange = { color = it },
                        onNotesChange = { notes = it },
                    )
                }
            }
            ActionBar {
                TesseroneButton(
                    title = if (step == WizardStep.Barcode) t("common.cancel") else t("common.back"),
                    onClick = { goBack() },
                    variant = ButtonVariant.Secondary,
                    modifier = Modifier.weight(1f),
                )
                TesseroneButton(
                    title = if (step == WizardStep.Finish) t("add.save") else t("common.next"),
                    onClick = { goNext() },
                    variant = ButtonVariant.Primary,
                    enabled = canAdvance,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        if (cameraOpen) {
            BarcodeScannerOverlay(
                onDetected = { scanned ->
                    cameraOpen = false
                    applyScan(scanned.code, scanned.format)
                },
                onCancel = { cameraOpen = false },
            )
        }

        if (invalidDialog) {
            ConfirmDialog(
                title = t("add.invalidBarcodeTitle"),
                body = t("add.invalidBarcodeBody", mapOf("format" to format.name)),
                confirmLabel = t("common.gotIt"),
                cancelLabel = t("common.cancel"),
                onConfirm = { invalidDialog = false },
                onCancel = { invalidDialog = false },
            )
        }

        snackbar?.let { (message, action) ->
            AppSnackbar(
                message = message,
                actionLabel = action,
                onAction = {
                    openAppSettings(context)
                    snackbar = null
                },
                onDismiss = { snackbar = null },
            )
        }
    }
}

@Composable
private fun WizardProgress(stepIndex: Int, total: Int, title: String, subtitle: String) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .drawBottomHairline(colors.outline)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            repeat(total) { i ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .background(if (i <= stepIndex) Accent else colors.outline),
                )
            }
        }
        Text(
            text = t("add.stepIndicator", mapOf("current" to stepIndex + 1, "total" to total)).uppercase(),
            color = colors.onSurfaceVariant,
            fontFamily = Mono.bold,
            fontSize = 11.sp,
            letterSpacing = 1.2.sp,
        )
        Text(text = title, color = colors.onBackground, fontFamily = Mono.extraBold, fontSize = 24.sp)
        Text(text = subtitle, color = colors.onSurfaceVariant, fontFamily = Mono.regular, fontSize = 12.sp)
    }
}

@Composable
private fun StepBarcode(
    code: String,
    format: BarcodeFormat,
    onCodeChange: (String) -> Unit,
    onFormatChange: (BarcodeFormat) -> Unit,
    scanStatus: ScanStatus,
    pickedImageUri: String?,
    showEntry: Boolean,
    onScan: () -> Unit,
    onPhoto: () -> Unit,
    onType: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        MethodTile(t("add.methodScanTitle"), t("add.methodScanHint"), onScan)
        MethodTile(t("add.methodPhotoTitle"), t("add.methodPhotoHint"), onPhoto)
        MethodTile(t("add.methodTypeTitle"), t("add.methodTypeHint"), onType)

        if (scanStatus == ScanStatus.Scanning) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(ChromeRadius)
                    .background(colors.surface)
                    .border(1.dp, colors.outline, ChromeRadius)
                    .padding(14.dp),
            ) {
                Text(t("add.scanningImage"), color = colors.onSurface, fontFamily = Mono.regular, fontSize = 16.sp)
            }
        }
        if (scanStatus == ScanStatus.NotFound && pickedImageUri != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(ChromeRadius)
                    .background(colors.surface)
                    .border(1.dp, colors.outline, ChromeRadius)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val thumb = remember(pickedImageUri) {
                    try {
                        context.contentResolver.openInputStream(Uri.parse(pickedImageUri))?.use {
                            android.graphics.BitmapFactory.decodeStream(it)?.asImageBitmap()
                        }
                    } catch (_: Exception) {
                        null
                    }
                }
                if (thumb != null) {
                    Image(
                        bitmap = thumb,
                        contentDescription = t("add.sharedImageLabel"),
                        modifier = Modifier.size(64.dp).clip(ChromeRadius),
                        contentScale = ContentScale.Crop,
                    )
                }
                Text(
                    t("add.scanNotFound"),
                    color = colors.onSurface,
                    fontFamily = Mono.regular,
                    fontSize = 16.sp,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        if (showEntry) {
            SectionLabel(t("add.labelBarcode"))
            TesseroneField(
                value = code,
                onValueChange = onCodeChange,
                placeholder = t("add.placeholderBarcode"),
            )
            SectionLabel(t("add.labelFormat"))
            FormatChips(selected = format, onSelect = onFormatChange)
        }
    }
}

@Composable
private fun MethodTile(title: String, hint: String, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp)
            .clip(ChromeRadius)
            .background(colors.surface)
            .border(1.dp, colors.outline, ChromeRadius)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = title, color = colors.onSurface, fontFamily = Mono.bold, fontSize = 16.sp)
        Text(text = hint, color = colors.onSurfaceVariant, fontFamily = Mono.regular, fontSize = 12.sp)
    }
}

@Composable
private fun StepBrand(
    name: String,
    logoSlug: String?,
    customLogoUri: String?,
    color: String,
    brands: com.chipcolate.tesserone.core.brands.BrandIndex,
    filesDir: File,
    onNameChange: (String) -> Unit,
    onBrandSelect: (BrandEntry) -> Unit,
    onCustomLogoPick: (Uri) -> Unit,
    onClearLogo: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<BrandEntry>>(emptyList()) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Text(
            text = t("add.brandSearchLabel").uppercase(),
            color = colors.onSurfaceVariant,
            fontFamily = Mono.bold,
            fontSize = 13.sp,
            letterSpacing = 0.8.sp,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(ChromeRadius)
                .background(colors.surface)
                .border(1.dp, colors.outline, ChromeRadius)
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("⌕", color = colors.onSurfaceVariant, fontFamily = Mono.regular, fontSize = 22.sp)
            BasicTextField(
                value = query,
                onValueChange = {
                    query = it
                    results = brands.search(it)
                },
                modifier = Modifier.weight(1f),
                textStyle = TextStyle(fontFamily = Mono.regular, fontSize = 16.sp, color = colors.onSurface),
                singleLine = true,
                cursorBrush = SolidColor(colors.onSurface),
                keyboardOptions = KeyboardOptions(autoCorrectEnabled = false),
                decorationBox = { inner ->
                    Box {
                        if (query.isEmpty()) {
                            Text(
                                t("add.brandSearchPlaceholder"),
                                color = colors.onSurfaceVariant,
                                fontFamily = Mono.regular,
                                fontSize = 16.sp,
                            )
                        }
                        inner()
                    }
                },
            )
        }
        if (query.trim().isNotEmpty() && results.isEmpty()) {
            Text(
                t("add.brandNoResults"),
                color = colors.onSurfaceVariant,
                fontFamily = Mono.regular,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
        BrandResultList(
            results = results,
            selectedSlug = logoSlug,
            onSelect = {
                onBrandSelect(it)
                query = ""
                results = emptyList()
            },
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp)
                .height(1.dp)
                .background(colors.outline),
        )
        SectionLabel(t("add.brandCustomTitle"))
        Text(
            t("add.brandCustomHint"),
            color = colors.onSurfaceVariant,
            fontFamily = Mono.regular,
            fontSize = 12.sp,
            modifier = Modifier.padding(bottom = 10.dp),
        )
        TesseroneField(
            value = name,
            onValueChange = onNameChange,
            placeholder = t("add.placeholderName"),
            capitalization = KeyboardCapitalization.Words,
        )
        Box(modifier = Modifier.padding(top = 16.dp)) {
            LogoSelector(
                logoSlug = logoSlug,
                customLogoUri = customLogoUri,
                cardName = name,
                cardColor = color,
                brands = brands,
                filesDir = filesDir,
                onCustomLogoPick = onCustomLogoPick,
                onClear = onClearLogo,
            )
        }
    }
}

@Composable
private fun StepFinish(
    previewCard: FidelityCard,
    color: String,
    notes: String,
    brands: com.chipcolate.tesserone.core.brands.BrandIndex,
    filesDir: File,
    onColorChange: (String) -> Unit,
    onNotesChange: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Box(modifier = Modifier.fillMaxWidth().height(150.dp)) {
            CardFace(card = previewCard, brands = brands, filesDir = filesDir)
        }
        Box(modifier = Modifier.fillMaxWidth().height(300.dp).padding(top = 12.dp)) {
            CardBack(card = previewCard, brands = brands)
        }
        SectionLabel(t("add.labelColor"))
        ColorGrid(selected = color, onSelect = onColorChange)
        SectionLabel(t("add.labelNotes"))
        TesseroneField(
            value = notes,
            onValueChange = onNotesChange,
            placeholder = t("add.placeholderNotes"),
            singleLine = false,
            minHeight = 80,
        )
    }
}

private fun Modifier.drawBottomHairline(color: androidx.compose.ui.graphics.Color): Modifier =
    drawBehind {
        drawLine(
            color = color,
            start = Offset(0f, size.height),
            end = Offset(size.width, size.height),
            strokeWidth = 1.dp.toPx(),
        )
    }
