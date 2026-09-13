package com.chipcolate.tesserone.wear.ui

import android.app.Application
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.chipcolate.tesserone.core.i18n.Strings
import com.chipcolate.tesserone.core.i18n.loadStrings
import com.chipcolate.tesserone.core.i18n.resolveLanguage
import com.chipcolate.tesserone.core.model.LanguagePreference
import com.chipcolate.tesserone.core.model.WatchSnapshot
import com.chipcolate.tesserone.core.model.sortedCards
import com.chipcolate.tesserone.wear.sync.SnapshotRepository
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

val LocalWearStrings = staticCompositionLocalOf { Strings.fallback() }

class WearViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = SnapshotRepository.get(app)
    val snapshot = repo.snapshot
    val logos = repo.logos
    val schemaOutdated = repo.schemaOutdated
}

@Composable
fun WearApp(vm: WearViewModel = viewModel()) {
    val snapshot by vm.snapshot.collectAsState()
    val logos by vm.logos.collectAsState()
    val outdated by vm.schemaOutdated.collectAsState()
    val context = LocalContext.current
    var strings by remember { mutableStateOf(Strings.fallback()) }
    LaunchedEffect(Unit) {
        strings = withContext(Dispatchers.IO) {
            context.loadStrings(resolveLanguage(LanguagePreference.SYSTEM))
        }
    }
    MaterialTheme {
        CompositionLocalProvider(LocalWearStrings provides strings) {
            WearNav(snapshot, logos, outdated)
        }
    }
}

@Composable
private fun WearNav(
    snapshot: WatchSnapshot?,
    logos: Map<String, File>,
    outdated: Boolean,
) {
    val nav = rememberSwipeDismissableNavController()
    SwipeDismissableNavHost(navController = nav, startDestination = "home") {
        composable("home") {
            when {
                outdated -> StatusScreen(
                    title = LocalWearStrings.current.t("watch.updateRequired"),
                    body = LocalWearStrings.current.t("watch.updateRequiredBody"),
                )
                snapshot == null -> SyncingScreen()
                snapshot.cards.isEmpty() -> StatusScreen(
                    title = LocalWearStrings.current.t("watch.noCards"),
                    body = LocalWearStrings.current.t("watch.addOnPhone"),
                )
                else -> CardListScreen(
                    cards = snapshot.sortedCards(),
                    logos = logos,
                    onOpen = { nav.navigate("card/$it") },
                )
            }
        }
        composable(
            "card/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("id")
            val card = snapshot?.cards?.find { it.id == id }
            if (card == null) {
                StatusScreen(
                    title = LocalWearStrings.current.t("watch.noCards"),
                    body = LocalWearStrings.current.t("watch.addOnPhone"),
                )
            } else {
                BarcodeScreen(card)
            }
        }
    }
}

@Composable
private fun SyncingScreen() {
    val strings = LocalWearStrings.current
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator()
            Text(strings.t("watch.syncing"))
        }
    }
}
