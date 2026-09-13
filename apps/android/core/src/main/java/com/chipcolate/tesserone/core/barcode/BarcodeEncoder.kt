package com.chipcolate.tesserone.core.barcode

import android.graphics.Bitmap
import android.graphics.Color
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.google.zxing.BarcodeFormat as ZxingFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter
import com.google.zxing.common.BitMatrix
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

object BarcodeEncoder {
    fun encodeMatrix(
        code: String,
        format: BarcodeFormat,
        width: Int = 1,
        height: Int = 1,
    ): BitMatrix? {
        val contents = code.trim()
        if (contents.isEmpty()) return null
        val zxing = format.toZxing() ?: return null
        val hints = hashMapOf<EncodeHintType, Any>(
            EncodeHintType.MARGIN to 1,
            EncodeHintType.CHARACTER_SET to "UTF-8",
        )
        when (format) {
            BarcodeFormat.QR, BarcodeFormat.AZTEC ->
                hints[EncodeHintType.ERROR_CORRECTION] = ErrorCorrectionLevel.M
            else -> Unit
        }
        return try {
            val w = width.coerceAtLeast(1)
            val h = height.coerceAtLeast(1)
            MultiFormatWriter().encode(contents, zxing, w, h, hints)
        } catch (_: Exception) {
            null
        }
    }

    fun encodeBitmap(
        code: String,
        format: BarcodeFormat,
        widthPx: Int,
        heightPx: Int,
    ): Bitmap? {
        val matrix = encodeMatrix(code, format, widthPx.coerceAtLeast(1), heightPx.coerceAtLeast(1))
            ?: return null
        return matrix.toBitmap()
    }
}

fun BitMatrix.toBitmap(): Bitmap {
    val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val row = IntArray(width)
    for (y in 0 until height) {
        for (x in 0 until width) {
            row[x] = if (get(x, y)) Color.BLACK else Color.WHITE
        }
        bmp.setPixels(row, 0, width, 0, y, width, 1)
    }
    return bmp
}

private fun BarcodeFormat.toZxing(): ZxingFormat? = when (this) {
    BarcodeFormat.QR -> ZxingFormat.QR_CODE
    BarcodeFormat.EAN13 -> ZxingFormat.EAN_13
    BarcodeFormat.EAN8 -> ZxingFormat.EAN_8
    BarcodeFormat.CODE128 -> ZxingFormat.CODE_128
    BarcodeFormat.CODE39 -> ZxingFormat.CODE_39
    BarcodeFormat.UPCA -> ZxingFormat.UPC_A
    BarcodeFormat.UPCE -> ZxingFormat.UPC_E
    BarcodeFormat.PDF417 -> ZxingFormat.PDF_417
    BarcodeFormat.AZTEC -> ZxingFormat.AZTEC
    BarcodeFormat.DATAMATRIX -> ZxingFormat.DATA_MATRIX
    BarcodeFormat.ITF14 -> ZxingFormat.ITF
}
