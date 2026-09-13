package com.chipcolate.tesserone.core.barcode

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.io.File
import java.io.InputStream
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

sealed class ImageScanResult {
    data class Detected(val code: ScannedCode) : ImageScanResult()
    data object NotFound : ImageScanResult()
    data object Error : ImageScanResult()
}

fun mlKitFormatName(format: Int): String = when (format) {
    Barcode.FORMAT_QR_CODE -> "qr"
    Barcode.FORMAT_EAN_13 -> "ean13"
    Barcode.FORMAT_EAN_8 -> "ean8"
    Barcode.FORMAT_CODE_128 -> "code128"
    Barcode.FORMAT_CODE_39 -> "code39"
    Barcode.FORMAT_CODE_93 -> "code93"
    Barcode.FORMAT_UPC_A -> "upc_a"
    Barcode.FORMAT_UPC_E -> "upc_e"
    Barcode.FORMAT_PDF417 -> "pdf417"
    Barcode.FORMAT_AZTEC -> "aztec"
    Barcode.FORMAT_DATA_MATRIX -> "datamatrix"
    Barcode.FORMAT_ITF -> "itf14"
    Barcode.FORMAT_CODABAR -> "codabar"
    else -> "unknown"
}

class ImageBarcodeDetector(private val context: Context) {
    suspend fun detect(uri: Uri): ImageScanResult {
        val bitmap = try {
            decodeBitmap(uri)
        } catch (_: Exception) {
            null
        } ?: return ImageScanResult.Error

        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
            .build()
        val scanner = BarcodeScanning.getClient(options)
        val image = InputImage.fromBitmap(bitmap, 0)
        return try {
            suspendCancellableCoroutine { cont ->
                scanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        val first = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }
                        val result = if (first == null) {
                            ImageScanResult.NotFound
                        } else {
                            val mapped = mapBarcodeType(mlKitFormatName(first.format))
                            val fixed = fixScannedCode(first.rawValue!!.trim(), mapped)
                            ImageScanResult.Detected(fixed)
                        }
                        if (cont.isActive) cont.resume(result)
                    }
                    .addOnFailureListener {
                        if (cont.isActive) cont.resume(ImageScanResult.Error)
                    }
                cont.invokeOnCancellation { scanner.close() }
            }
        } finally {
            scanner.close()
        }
    }

    private fun decodeBitmap(uri: Uri): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        open(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            // Bounds pass can fail for some streams; try a full decode.
            return open(uri)?.use { BitmapFactory.decodeStream(it) }
        }
        var sample = 1
        val max = 2048
        while (bounds.outWidth / sample > max || bounds.outHeight / sample > max) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        return open(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
    }

    private fun open(uri: Uri): InputStream? {
        return when (uri.scheme) {
            "content" -> context.contentResolver.openInputStream(uri)
            "file", null -> {
                val path = uri.path ?: uri.toString().removePrefix("file://")
                val file = File(path)
                if (file.isFile) file.inputStream() else context.contentResolver.openInputStream(uri)
            }
            else -> context.contentResolver.openInputStream(uri)
        }
    }
}
