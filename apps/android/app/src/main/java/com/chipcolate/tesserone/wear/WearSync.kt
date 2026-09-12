package com.chipcolate.tesserone.wear

import android.content.Context
import android.util.Log
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.brands.loadCardLogoBitmap
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.WatchJson
import com.chipcolate.tesserone.core.model.customLogoFilename
import com.chipcolate.tesserone.core.model.toWatchSnapshot
import com.chipcolate.tesserone.core.store.WalletPaths
import com.chipcolate.tesserone.core.store.WalletStore
import com.chipcolate.tesserone.core.wear.WearPaths
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.wearable.Asset
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.io.ByteArrayOutputStream
import java.io.File
import kotlinx.coroutines.tasks.await
import android.graphics.Bitmap

object WearSync {
    private const val TAG = "WearSync"
    private const val PREFS = "wear_known_logos"

    suspend fun push(context: Context, forceLogos: Boolean = false) {
        val client = Wearable.getDataClient(context)
        try {
            GoogleApiAvailability.getInstance().checkApiAvailability(client).await()
        } catch (e: Exception) {
            Log.w(TAG, "Wearable Data Layer unavailable", e)
            return
        }
        val wallet = WalletStore(context.filesDir).snapshot()
        val snapshot = wallet.toWatchSnapshot()
        val json = WatchJson.encode(snapshot)
        try {
            val req = PutDataMapRequest.create(WearPaths.SNAPSHOT)
            req.dataMap.putString(WearPaths.JSON_KEY, json)
            req.dataMap.putLong(WearPaths.UPDATED_AT, System.currentTimeMillis())
            client.putDataItem(req.asPutDataRequest().setUrgent()).await()
        } catch (e: Exception) {
            Log.w(TAG, "put snapshot failed", e)
            return
        }
        val brands = runCatching { BrandIndex.fromAssets(context) }.getOrElse { BrandIndex(emptyList()) }
        val desired = LinkedHashMap<String, Pair<FidelityCard, String>>()
        for (card in wallet.cards.values) {
            val key = logoKey(card) ?: continue
            desired[key] = card to card.updatedAt
        }
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (forceLogos) prefs.edit().clear().apply()
        for ((key, pair) in desired) {
            val (card, updatedAt) = pair
            if (prefs.getString(key, null) == updatedAt) continue
            val bytes = logoBytes(context, card, brands) ?: continue
            try {
                val req = PutDataMapRequest.create(WearPaths.logoPath(key))
                req.dataMap.putString(WearPaths.LOGO_KEY, key)
                req.dataMap.putString(WearPaths.UPDATED_AT, updatedAt)
                req.dataMap.putAsset(WearPaths.IMAGE, Asset.createFromBytes(bytes))
                client.putDataItem(req.asPutDataRequest().setUrgent()).await()
                prefs.edit().putString(key, updatedAt).apply()
            } catch (e: Exception) {
                Log.w(TAG, "put logo $key failed", e)
            }
        }
        val keep = desired.keys
        val stale = prefs.all.keys.filter { it !in keep }
        for (key in stale) {
            try {
                client.deleteDataItems(
                    android.net.Uri.parse("wear://*${WearPaths.logoPath(key)}"),
                ).await()
            } catch (e: Exception) {
                Log.w(TAG, "delete logo $key failed", e)
            }
        }
        if (stale.isNotEmpty()) {
            val editor = prefs.edit()
            stale.forEach { editor.remove(it) }
            editor.apply()
        }
    }

    private fun logoKey(card: FidelityCard): String? = when {
        customLogoFilename(card.customLogoUri) != null -> "custom:${card.id}"
        !card.logoSlug.isNullOrBlank() -> "bundled:${card.logoSlug}"
        else -> null
    }

    private fun logoBytes(context: Context, card: FidelityCard, brands: BrandIndex): ByteArray? {
        val custom = customLogoFilename(card.customLogoUri)
        if (custom != null) {
            val file = File(WalletPaths.customLogosDir(context.filesDir), custom)
            if (file.isFile) return runCatching { file.readBytes() }.getOrNull()
        }
        val bmp = loadCardLogoBitmap(context, card, brands) ?: return null
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        return out.toByteArray()
    }
}
