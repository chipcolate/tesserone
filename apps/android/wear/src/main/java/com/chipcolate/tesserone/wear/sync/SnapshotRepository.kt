package com.chipcolate.tesserone.wear.sync

import android.content.Context
import android.util.Log
import com.chipcolate.tesserone.core.model.WATCH_SCHEMA_VERSION
import com.chipcolate.tesserone.core.model.WatchJson
import com.chipcolate.tesserone.core.model.WatchSnapshot
import com.chipcolate.tesserone.core.wear.WearPaths
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class SnapshotRepository private constructor(private val context: Context) : DataClient.OnDataChangedListener {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val snapshotFile = File(context.filesDir, "snapshot.json")
    private val logosDir = File(context.filesDir, "logos")

    private val _snapshot = MutableStateFlow<WatchSnapshot?>(null)
    val snapshot: StateFlow<WatchSnapshot?> = _snapshot

    private val _logos = MutableStateFlow<Map<String, File>>(emptyMap())
    val logos: StateFlow<Map<String, File>> = _logos

    private val _schemaOutdated = MutableStateFlow(false)
    val schemaOutdated: StateFlow<Boolean> = _schemaOutdated

    init {
        logosDir.mkdirs()
        loadFromDisk()
        indexLogos()
        Wearable.getDataClient(context).addListener(this)
        scope.launch {
            pullExisting()
            if (_snapshot.value == null) requestInitialSync()
        }
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type != DataEvent.TYPE_CHANGED && event.type != DataEvent.TYPE_DELETED) continue
            handleItem(event.dataItem.uri.path, event)
        }
    }

    fun logoFile(key: String): File? = _logos.value[key]

    private fun handleItem(path: String?, event: DataEvent) {
        when {
            path == WearPaths.SNAPSHOT && event.type == DataEvent.TYPE_CHANGED -> {
                val json = DataMapItem.fromDataItem(event.dataItem).dataMap.getString(WearPaths.JSON_KEY)
                    ?: return
                applyJson(json)
            }
            path?.startsWith(WearPaths.LOGO_PREFIX) == true && event.type == DataEvent.TYPE_CHANGED -> {
                val key = WearPaths.logoKeyFromPath(path) ?: return
                val asset = DataMapItem.fromDataItem(event.dataItem).dataMap.getAsset(WearPaths.IMAGE)
                    ?: return
                scope.launch { saveAsset(key, asset) }
            }
            path?.startsWith(WearPaths.LOGO_PREFIX) == true && event.type == DataEvent.TYPE_DELETED -> {
                val key = WearPaths.logoKeyFromPath(path) ?: return
                logoDiskFile(key).delete()
                indexLogos()
            }
        }
    }

    private fun applyJson(json: String) {
        val snap = runCatching { WatchJson.decode(json) }.getOrElse {
            Log.w(TAG, "snapshot decode failed", it)
            return
        }
        if (snap.schemaVersion > WATCH_SCHEMA_VERSION) {
            _schemaOutdated.value = true
            return
        }
        runCatching { snapshotFile.writeText(json) }
        _snapshot.value = snap
        _schemaOutdated.value = false
    }

    private suspend fun saveAsset(key: String, asset: com.google.android.gms.wearable.Asset) {
        try {
            val fd = Wearable.getDataClient(context).getFdForAsset(asset).await()
            fd.inputStream.use { input ->
                val dest = logoDiskFile(key)
                dest.parentFile?.mkdirs()
                dest.outputStream().use { input.copyTo(it) }
            }
            indexLogos()
        } catch (e: Exception) {
            Log.w(TAG, "logo asset $key failed", e)
        }
    }

    private suspend fun pullExisting() {
        try {
            val items = Wearable.getDataClient(context).dataItems.await()
            try {
                for (item in items) {
                    val path = item.uri.path
                    if (path == WearPaths.SNAPSHOT) {
                        DataMapItem.fromDataItem(item).dataMap.getString(WearPaths.JSON_KEY)?.let { applyJson(it) }
                    } else if (path?.startsWith(WearPaths.LOGO_PREFIX) == true) {
                        val key = WearPaths.logoKeyFromPath(path) ?: continue
                        val asset = DataMapItem.fromDataItem(item).dataMap.getAsset(WearPaths.IMAGE) ?: continue
                        saveAsset(key, asset)
                    }
                }
            } finally {
                items.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "pullExisting failed", e)
        }
    }

    private suspend fun requestInitialSync() {
        try {
            val nodes = Wearable.getNodeClient(context).connectedNodes.await()
            val client: MessageClient = Wearable.getMessageClient(context)
            for (node in nodes) {
                client.sendMessage(node.id, WearPaths.REQUEST_SYNC, ByteArray(0)).await()
            }
        } catch (e: Exception) {
            Log.w(TAG, "requestInitialSync failed", e)
        }
    }

    private fun loadFromDisk() {
        if (!snapshotFile.isFile) return
        val snap = runCatching { WatchJson.decode(snapshotFile.readText()) }.getOrNull() ?: return
        if (snap.schemaVersion > WATCH_SCHEMA_VERSION) {
            _schemaOutdated.value = true
            return
        }
        _snapshot.value = snap
    }

    private fun indexLogos() {
        val map = logosDir.listFiles()?.associate { file ->
            keyFromFile(file.name) to file
        }.orEmpty()
        _logos.value = map
    }

    private fun logoDiskFile(key: String): File = File(logosDir, fileName(key))

    private fun fileName(key: String): String = key.replace(":", "__") + ".png"

    private fun keyFromFile(name: String): String = name.removeSuffix(".png").replace("__", ":")

    companion object {
        private const val TAG = "SnapshotRepository"

        @Volatile
        private var instance: SnapshotRepository? = null

        fun get(context: Context): SnapshotRepository {
            return instance ?: synchronized(this) {
                instance ?: SnapshotRepository(context.applicationContext).also { instance = it }
            }
        }
    }
}
