package com.chipcolate.tesserone

import android.content.Context
import com.chipcolate.tesserone.wear.WearSync
import com.chipcolate.tesserone.widget.WidgetUpdater
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Debounced Glance + Wear Data Layer push after wallet writes. */
object CompanionSurfaces {
    private const val DEBOUNCE_MS = 500L
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Any()
    private var job: Job? = null

    fun start(context: Context) {
        onWalletChanged(context)
    }

    fun onWalletChanged(context: Context, forceLogos: Boolean = false) {
        val app = context.applicationContext
        synchronized(lock) {
            job?.cancel()
            job = scope.launch {
                delay(DEBOUNCE_MS)
                runCatching { WidgetUpdater.updateAll(app) }
                runCatching { WearSync.push(app, forceLogos = forceLogos) }
            }
        }
    }
}
