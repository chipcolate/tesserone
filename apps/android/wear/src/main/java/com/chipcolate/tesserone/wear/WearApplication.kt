package com.chipcolate.tesserone.wear

import android.app.Application
import com.chipcolate.tesserone.wear.sync.SnapshotRepository

class WearApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SnapshotRepository.get(this)
    }
}
