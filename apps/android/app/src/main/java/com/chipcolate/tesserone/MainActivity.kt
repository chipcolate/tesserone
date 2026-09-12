package com.chipcolate.tesserone

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import com.chipcolate.tesserone.ui.HomeScreen
import com.chipcolate.tesserone.ui.add.AddWizardScreen
import com.chipcolate.tesserone.ui.edit.EditCardScreen
import com.chipcolate.tesserone.ui.i18n.LocalStrings
import com.chipcolate.tesserone.ui.settings.SettingsScreen
import com.chipcolate.tesserone.ui.theme.TesseroneTheme

class MainActivity : ComponentActivity() {
    private val viewModel: HomeViewModel by viewModels()
    private var barcodeVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        viewModel.consumeIntent(intent)
        setContent {
            TesseroneTheme(viewModel.settings.themeMode) {
                CompositionLocalProvider(LocalStrings provides viewModel.strings) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        LaunchedEffect(viewModel.ready, viewModel.pendingShareUri) {
                            if (viewModel.ready && viewModel.pendingShareUri != null) {
                                val uri = viewModel.consumePendingShare()
                                if (uri != null) viewModel.openAdd(uri)
                            }
                        }

                        when (val screen = viewModel.screen) {
                            Screen.Home -> HomeScreen(
                                viewModel = viewModel,
                                onMaxBrightness = {
                                    barcodeVisible = true
                                    setMaxBrightness()
                                },
                                onRestoreBrightness = {
                                    barcodeVisible = false
                                    restoreAdaptiveBrightness()
                                },
                                onAdd = { viewModel.openAdd() },
                                onSettings = { viewModel.openSettings() },
                                onEdit = { viewModel.openEdit(it) },
                            )
                            is Screen.Add -> {
                                BackHandler { viewModel.goHome() }
                                AddWizardScreen(
                                    viewModel = viewModel,
                                    sharedImageUri = screen.sharedImageUri,
                                    onClose = { viewModel.goHome() },
                                )
                            }
                            is Screen.Edit -> {
                                BackHandler { viewModel.goHome() }
                                EditCardScreen(
                                    viewModel = viewModel,
                                    cardId = screen.cardId,
                                    onClose = { viewModel.goHome() },
                                )
                            }
                            Screen.Settings -> {
                                BackHandler { viewModel.goHome() }
                                SettingsScreen(
                                    viewModel = viewModel,
                                    onClose = { viewModel.goHome() },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        viewModel.consumeIntent(intent)
    }

    override fun onStart() {
        super.onStart()
        if (barcodeVisible) setMaxBrightness()
    }

    override fun onStop() {
        restoreAdaptiveBrightness()
        super.onStop()
    }

    private fun setMaxBrightness() {
        val lp = window.attributes
        lp.screenBrightness = 1f
        window.attributes = lp
    }

    private fun restoreAdaptiveBrightness() {
        val lp = window.attributes
        lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        window.attributes = lp
    }
}
