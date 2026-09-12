package com.chipcolate.tesserone.widget

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.chipcolate.tesserone.ui.components.ButtonVariant
import com.chipcolate.tesserone.ui.components.TesseroneButton
import com.chipcolate.tesserone.ui.i18n.LocalStrings
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.TesseroneTheme
import com.chipcolate.tesserone.ui.theme.parseHexColor
import com.chipcolate.tesserone.ui.theme.textOnColor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.foundation.Image
import androidx.compose.runtime.CompositionLocalProvider

class WidgetConfigurationActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        )
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }
        setResult(
            RESULT_CANCELED,
            Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId),
        )
        val isSingle = WidgetPrefs.isSingleCard(this, appWidgetId)
        setContent {
            TesseroneTheme(ThemeMode.DARK) {
                WidgetConfigScreen(
                    appWidgetId = appWidgetId,
                    isSingle = isSingle,
                    onCancel = { finish() },
                    onSaved = {
                        setResult(
                            RESULT_OK,
                            Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId),
                        )
                        finish()
                    },
                )
            }
        }
    }
}

@Composable
private fun WidgetConfigScreen(
    appWidgetId: Int,
    isSingle: Boolean,
    onCancel: () -> Unit,
    onSaved: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var strings by remember { mutableStateOf(Strings.fallback()) }
    var cards by remember { mutableStateOf<List<Pair<FidelityCard, WidgetCardView?>>>(emptyList()) }
    var selected by remember { mutableStateOf<Set<String>>(emptySet()) }
    var ready by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(appWidgetId, isSingle) {
        withContext(Dispatchers.IO) {
            val wallet = WalletStore(context.filesDir).snapshot()
            val brands = runCatching { BrandIndex.fromAssets(context) }.getOrElse { BrandIndex(emptyList()) }
            strings = context.loadStrings(resolveLanguage(wallet.settings.language))
            val ordered = getSortedCards(wallet.cards, wallet.settings.sortMode)
            cards = ordered.map { card ->
                val color = brands.cardBackground(card.color, card.logoSlug)
                card to WidgetCardView(
                    id = card.id,
                    name = card.name,
                    color = color,
                    initial = card.initial(),
                    lightText = true,
                    logo = loadCardLogoBitmap(context, card, brands),
                )
            }
            selected = if (isSingle) {
                WidgetPrefs.singleCardId(context, appWidgetId)?.let { setOf(it) } ?: emptySet()
            } else {
                WidgetPrefs.listCardIds(context, appWidgetId).toSet()
            }
            ready = true
        }
    }

    if (!ready) {
        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background))
        return
    }

    CompositionLocalProvider(LocalStrings provides strings) {
        val colors = MaterialTheme.colorScheme
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.background)
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(16.dp),
        ) {
            Text(
                text = strings.t(if (isSingle) "widget.pickOne" else "widget.pickMany").uppercase(),
                color = colors.onBackground,
                fontFamily = Mono.bold,
                fontSize = 16.sp,
                letterSpacing = 1.sp,
            )
            Spacer(modifier = Modifier.height(12.dp))
            LazyColumn(modifier = Modifier.weight(1f)) {
                if (cards.isEmpty()) {
                    item {
                        Text(
                            text = strings.t("widget.configEmpty"),
                            color = colors.onSurfaceVariant,
                            fontFamily = Mono.regular,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                        )
                    }
                }
                items(cards, key = { it.first.id }) { (card, view) ->
                    val isSel = selected.contains(card.id)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .border(1.dp, if (isSel) colors.onBackground else colors.outline)
                            .clickable {
                                selected = if (isSingle) {
                                    setOf(card.id)
                                } else if (isSel) {
                                    selected - card.id
                                } else {
                                    selected + card.id
                                }
                            }
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val swatch = view ?: return@Row
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(parseHexColor(swatch.color)),
                            contentAlignment = Alignment.Center,
                        ) {
                            val bmp = swatch.logo
                            if (bmp != null) {
                                Image(
                                    bitmap = bmp.asImageBitmap(),
                                    contentDescription = card.name,
                                    modifier = Modifier.size(30.dp),
                                    contentScale = ContentScale.Fit,
                                )
                            } else {
                                Text(
                                    text = swatch.initial,
                                    color = textOnColor(swatch.color),
                                    fontFamily = Mono.bold,
                                    fontSize = 18.sp,
                                )
                            }
                        }
                        Text(
                            text = card.name,
                            color = colors.onBackground,
                            fontFamily = Mono.regular,
                            fontSize = 15.sp,
                            maxLines = 1,
                            modifier = Modifier.weight(1f),
                        )
                        if (isSel) {
                            Text("✓", color = colors.onBackground, fontFamily = Mono.regular, fontSize = 18.sp)
                        }
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                TesseroneButton(
                    title = strings.t("common.cancel").uppercase(),
                    onClick = onCancel,
                    modifier = Modifier.weight(1f),
                    variant = ButtonVariant.Secondary,
                )
                TesseroneButton(
                    title = strings.t("common.save").uppercase(),
                    onClick = {
                        if (selected.isEmpty()) return@TesseroneButton
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                if (isSingle) {
                                    WidgetPrefs.saveSingle(context, appWidgetId, selected.first())
                                } else {
                                    WidgetPrefs.saveList(context, appWidgetId, selected.toList())
                                }
                                runCatching {
                                    val glanceId = GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId)
                                    if (isSingle) SingleCardWidget().update(context, glanceId)
                                    else CardListWidget().update(context, glanceId)
                                }
                            }
                            onSaved()
                        }
                    },
                    modifier = Modifier.weight(1f),
                    variant = ButtonVariant.Primary,
                    enabled = selected.isNotEmpty(),
                )
            }
        }
    }
}
