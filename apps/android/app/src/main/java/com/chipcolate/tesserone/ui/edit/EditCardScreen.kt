package com.chipcolate.tesserone.ui.edit

import android.view.HapticFeedbackConstants
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipcolate.tesserone.HomeViewModel
import com.chipcolate.tesserone.ui.components.ActionBar
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
import com.chipcolate.tesserone.ui.theme.CardRadius
import com.chipcolate.tesserone.ui.theme.DefaultCardColor
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.parseHexColor
import com.chipcolate.tesserone.ui.theme.textOnColor
import com.chipcolate.tesserone.util.formatMediumDate
import com.chipcolate.tesserone.util.shareJsonFile

@Composable
fun EditCardScreen(
    viewModel: HomeViewModel,
    cardId: String,
    onClose: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val context = LocalContext.current
    val view = LocalView.current
    val card = viewModel.cards.find { it.id == cardId }

    BackHandler(onBack = onClose)

    if (card == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.background)
                .statusBarsPadding()
                .padding(top = 100.dp),
        ) {
            Text(
                text = t("card.notFound"),
                color = colors.onSurfaceVariant,
                fontFamily = Mono.regular,
                fontSize = 16.sp,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            )
        }
        return
    }

    var name by remember { mutableStateOf(card.name) }
    var code by remember { mutableStateOf(card.code) }
    var format by remember { mutableStateOf(card.format) }
    var color by remember { mutableStateOf(card.color ?: DefaultCardColor) }
    var notes by remember { mutableStateOf(card.notes.orEmpty()) }
    var logoSlug by remember { mutableStateOf(card.logoSlug) }
    var customLogoUri by remember { mutableStateOf(card.customLogoUri) }
    val originalCustom = remember { card.customLogoUri }
    var brandResults by remember {
        mutableStateOf(
            if (card.logoSlug == null && card.name.isNotBlank()) viewModel.brands.search(card.name) else emptyList(),
        )
    }
    var confirmDelete by remember { mutableStateOf(false) }
    var missingName by remember { mutableStateOf(false) }

    fun discardDraft(ref: String?) {
        if (ref != null && ref != originalCustom) viewModel.deleteDraftLogo(ref)
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
            ) {
                Text(
                    text = t("card.title"),
                    color = colors.onBackground,
                    fontFamily = Mono.bold,
                    fontSize = 18.sp,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Box(
                modifier = Modifier
                    .padding(horizontal = 20.dp, vertical = 12.dp)
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(CardRadius)
                    .background(parseHexColor(color))
                    .padding(20.dp),
            ) {
                Column {
                    Text(
                        text = name.ifBlank { t("card.previewPlaceholder") },
                        color = textOnColor(color),
                        fontFamily = Mono.extraBold,
                        fontSize = 28.sp,
                        maxLines = 1,
                    )
                    if (code.isNotBlank()) {
                        Text(
                            text = code,
                            color = textOnColor(color).copy(alpha = 0.7f),
                            fontFamily = Mono.regular,
                            fontSize = 16.sp,
                            maxLines = 1,
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 20.dp),
            ) {
                SectionLabel(t("card.labelName"))
                TesseroneField(
                    value = name,
                    onValueChange = {
                        name = it
                        brandResults = viewModel.brands.search(it)
                    },
                    placeholder = t("card.placeholderName"),
                    capitalization = KeyboardCapitalization.Words,
                )
                BrandResultList(
                    results = brandResults,
                    selectedSlug = logoSlug,
                    onSelect = { brand ->
                        name = brand.name
                        logoSlug = brand.slug
                        discardDraft(customLogoUri)
                        customLogoUri = null
                        if (brand.primaryColor.isNotBlank()) color = brand.primaryColor
                        brandResults = emptyList()
                    },
                )

                SectionLabel(t("card.labelLogo"))
                LogoSelector(
                    logoSlug = logoSlug,
                    customLogoUri = customLogoUri,
                    cardName = name,
                    cardColor = color,
                    brands = viewModel.brands,
                    filesDir = viewModel.filesDir,
                    onCustomLogoPick = { uri ->
                        val filename = viewModel.copyCustomLogo(uri)
                        if (filename != null) {
                            if (customLogoUri != null && customLogoUri != filename) discardDraft(customLogoUri)
                            customLogoUri = filename
                            logoSlug = null
                            brandResults = emptyList()
                        }
                    },
                    onClear = {
                        logoSlug = null
                        discardDraft(customLogoUri)
                        customLogoUri = null
                        brandResults = emptyList()
                    },
                )

                SectionLabel(t("card.labelBarcode"))
                TesseroneField(
                    value = code,
                    onValueChange = { code = it },
                    placeholder = t("card.placeholderBarcode"),
                )

                SectionLabel(t("card.labelFormat"))
                FormatChips(selected = format, onSelect = { format = it })

                SectionLabel(t("card.labelColor"))
                ColorGrid(selected = color, onSelect = { color = it })

                SectionLabel(t("card.labelNotes"))
                TesseroneField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = t("card.placeholderNotes"),
                    singleLine = false,
                    minHeight = 80,
                )

                Text(
                    text = t(
                        "card.timestamps",
                        mapOf(
                            "created" to formatMediumDate(card.createdAt, viewModel.languageCode),
                            "updated" to formatMediumDate(card.updatedAt, viewModel.languageCode),
                        ),
                    ),
                    color = colors.onSurfaceVariant,
                    fontFamily = Mono.regular,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 16.dp),
                )

                TesseroneButton(
                    title = t("card.share"),
                    onClick = {
                        val json = viewModel.exportOneCard(card)
                        shareJsonFile(context, com.chipcolate.tesserone.core.io.cardFileName(card.name), json)
                    },
                    variant = ButtonVariant.Ghost,
                    modifier = Modifier.padding(top = 24.dp).fillMaxWidth(),
                )
            }

            ActionBar {
                TesseroneButton(
                    title = t("common.delete"),
                    onClick = { confirmDelete = true },
                    variant = ButtonVariant.Danger,
                )
                Spacer(Modifier.weight(1f))
                TesseroneButton(
                    title = t("common.cancel"),
                    onClick = {
                        discardDraft(customLogoUri)
                        onClose()
                    },
                    variant = ButtonVariant.Secondary,
                )
                TesseroneButton(
                    title = t("common.save"),
                    onClick = {
                        if (name.trim().isEmpty()) {
                            missingName = true
                            return@TesseroneButton
                        }
                        if (originalCustom != null && originalCustom != customLogoUri) {
                            viewModel.deleteDraftLogo(originalCustom)
                        }
                        viewModel.updateCard(
                            id = cardId,
                            name = name.trim(),
                            code = code.trim(),
                            format = format,
                            color = color,
                            logoSlug = logoSlug,
                            customLogoUri = customLogoUri,
                            notes = notes.trim().ifEmpty { null },
                        )
                        view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                        onClose()
                    },
                    variant = ButtonVariant.Primary,
                )
            }
        }

        if (confirmDelete) {
            ConfirmDialog(
                title = t("card.deleteConfirmTitle"),
                body = t("card.deleteConfirmBody", mapOf("name" to card.name)),
                confirmLabel = t("common.delete"),
                cancelLabel = t("common.cancel"),
                destructive = true,
                onConfirm = {
                    discardDraft(customLogoUri)
                    viewModel.removeCard(cardId)
                    view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                    confirmDelete = false
                    onClose()
                },
                onCancel = { confirmDelete = false },
            )
        }
        if (missingName) {
            ConfirmDialog(
                title = t("card.missingNameTitle"),
                body = t("card.missingNameBody"),
                confirmLabel = t("common.gotIt"),
                cancelLabel = t("common.cancel"),
                onConfirm = { missingName = false },
                onCancel = { missingName = false },
            )
        }
    }
}
