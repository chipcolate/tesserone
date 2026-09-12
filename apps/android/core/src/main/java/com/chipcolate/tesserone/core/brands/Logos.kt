package com.chipcolate.tesserone.core.brands

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.WatchSnapshotCard
import com.chipcolate.tesserone.core.model.customLogoFilename
import com.chipcolate.tesserone.core.store.WalletPaths
import java.io.File

fun FidelityCard.initial(): String =
    name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"

fun WatchSnapshotCard.initial(): String =
    name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"

fun loadCardLogoBitmap(
    context: Context,
    card: FidelityCard,
    brands: BrandIndex,
    filesDir: File = context.filesDir,
    maxPx: Int = 256,
): Bitmap? {
    val custom = customLogoFilename(card.customLogoUri)
    if (custom != null) {
        val file = File(WalletPaths.customLogosDir(filesDir), custom)
        decodeBounded(file)?.let { return it }
    }
    return loadBundledLogoBitmap(context, card.logoSlug, brands, maxPx)
}

fun loadBundledLogoBitmap(
    context: Context,
    logoSlug: String?,
    brands: BrandIndex,
    maxPx: Int = 256,
): Bitmap? {
    val filename = logoSlug?.let { brands.get(it)?.logo }.orEmpty()
    if (filename.isEmpty()) return null
    return try {
        context.assets.open("brands/logos/$filename").use { stream ->
            decodeBounded(stream.readBytes(), maxPx)
        }
    } catch (_: Exception) {
        null
    }
}

fun decodeBounded(file: File, maxPx: Int = 256): Bitmap? {
    if (!file.isFile) return null
    return try {
        decodeBounded(file.readBytes(), maxPx)
    } catch (_: Exception) {
        null
    }
}

fun decodeBounded(bytes: ByteArray, maxPx: Int = 256): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val largest = maxOf(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
    val sample = generateSequence(1) { it * 2 }.first { largest / it <= maxPx * 2 || it >= 32 }
    val opts = BitmapFactory.Options().apply { inSampleSize = sample }
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
}
