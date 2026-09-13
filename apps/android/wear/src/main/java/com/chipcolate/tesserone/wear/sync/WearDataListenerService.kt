package com.chipcolate.tesserone.wear.sync

import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.WearableListenerService

class WearDataListenerService : WearableListenerService() {
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        SnapshotRepository.get(this).onDataChanged(dataEvents)
    }
}
