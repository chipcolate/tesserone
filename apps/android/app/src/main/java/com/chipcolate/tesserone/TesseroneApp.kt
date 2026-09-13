package com.chipcolate.tesserone

import android.app.Application
import com.chipcolate.tesserone.core.migrate.ExpoMigrator
import com.chipcolate.tesserone.core.store.WalletStore
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class TesseroneApp : Application() {
    private val startScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startScope.launch {
            val store = WalletStore(filesDir)
            runCatching {
                ExpoMigrator.migrateIfNeeded(
                    store = store,
                    filesDir = filesDir,
                    databasesDir = File(applicationInfo.dataDir, "databases"),
                )
            }
            CompanionSurfaces.start(this@TesseroneApp)
        }
    }
}
