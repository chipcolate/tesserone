package com.chipcolate.tesserone.widget

import android.content.Context
import android.graphics.Bitmap
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.brands.initial
import com.chipcolate.tesserone.core.brands.loadCardLogoBitmap
import com.chipcolate.tesserone.core.i18n.Strings
import com.chipcolate.tesserone.core.i18n.loadStrings
import com.chipcolate.tesserone.core.i18n.resolveLanguage
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.ThemeMode
import com.chipcolate.tesserone.core.model.getSortedCards
import com.chipcolate.tesserone.core.store.WalletStore
import com.chipcolate.tesserone.ui.theme.isLightColor

data class WidgetCardView(
    val id: String,
    val name: String,
    val color: String,
    val initial: String,
    val lightText: Boolean,
    val logo: Bitmap?,
)

data class WidgetModel(
    val cards: List<WidgetCardView>,
    val emptyLabel: String,
    val darkChrome: Boolean,
)

object WidgetData {
    suspend fun loadSingle(context: Context, glanceId: GlanceId): WidgetModel {
        val state = loadState(context)
        val appWidgetId = appWidgetIdOf(context, glanceId)
        val configured = if (appWidgetId != null) WidgetPrefs.singleCardId(context, appWidgetId) else null
        val card = configured?.let { state.cards[it] } ?: state.ordered.firstOrNull()
        return WidgetModel(
            cards = listOfNotNull(card?.toView(context, state.brands)),
            emptyLabel = state.strings.t("widget.empty"),
            darkChrome = state.darkChrome,
        )
    }

    suspend fun loadList(context: Context, glanceId: GlanceId): WidgetModel {
        val state = loadState(context)
        val appWidgetId = appWidgetIdOf(context, glanceId)
        val configured = if (appWidgetId != null) WidgetPrefs.listCardIds(context, appWidgetId) else emptyList()
        val picked = if (configured.isEmpty()) {
            state.ordered
        } else {
            configured.mapNotNull { state.cards[it] }
        }
        return WidgetModel(
            cards = picked.map { it.toView(context, state.brands) },
            emptyLabel = state.strings.t("widget.empty"),
            darkChrome = state.darkChrome,
        )
    }

    private data class State(
        val cards: Map<String, FidelityCard>,
        val ordered: List<FidelityCard>,
        val brands: BrandIndex,
        val strings: Strings,
        val darkChrome: Boolean,
    )

    private suspend fun loadState(context: Context): State {
        val wallet = WalletStore(context.filesDir).snapshot()
        val brands = runCatching { BrandIndex.fromAssets(context) }.getOrElse { BrandIndex(emptyList()) }
        val strings = context.loadStrings(resolveLanguage(wallet.settings.language))
        val dark = when (wallet.settings.themeMode) {
            ThemeMode.DARK -> true
            ThemeMode.LIGHT -> false
            ThemeMode.SYSTEM -> (context.resources.configuration.uiMode and
                android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
                android.content.res.Configuration.UI_MODE_NIGHT_YES
        }
        return State(
            cards = wallet.cards,
            ordered = getSortedCards(wallet.cards, wallet.settings.sortMode),
            brands = brands,
            strings = strings,
            darkChrome = dark,
        )
    }

    private fun appWidgetIdOf(context: Context, glanceId: GlanceId): Int? =
        runCatching { GlanceAppWidgetManager(context).getAppWidgetId(glanceId) }.getOrNull()

    private fun FidelityCard.toView(context: Context, brands: BrandIndex): WidgetCardView {
        val color = brands.cardBackground(this.color, logoSlug)
        return WidgetCardView(
            id = id,
            name = name,
            color = color,
            initial = initial(),
            lightText = !isLightColor(color),
            logo = loadCardLogoBitmap(context, this, brands),
        )
    }
}
