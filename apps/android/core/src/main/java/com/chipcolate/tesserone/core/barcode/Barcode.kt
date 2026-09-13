package com.chipcolate.tesserone.core.barcode

import com.chipcolate.tesserone.core.model.BarcodeFormat

data class BarcodeFormatOption(
    val value: BarcodeFormat,
    val label: String,
)

/** Selectable formats for add/edit. Order is UI order. */
val BARCODE_FORMAT_OPTIONS: List<BarcodeFormatOption> = listOf(
    BarcodeFormatOption(BarcodeFormat.EAN13, "EAN-13"),
    BarcodeFormatOption(BarcodeFormat.EAN8, "EAN-8"),
    BarcodeFormatOption(BarcodeFormat.CODE128, "Code 128"),
    BarcodeFormatOption(BarcodeFormat.CODE39, "Code 39"),
    BarcodeFormatOption(BarcodeFormat.QR, "QR"),
    BarcodeFormatOption(BarcodeFormat.UPCA, "UPC-A"),
    BarcodeFormatOption(BarcodeFormat.UPCE, "UPC-E"),
)

fun mapBarcodeType(type: String): BarcodeFormat {
    val map = mapOf(
        "qr" to BarcodeFormat.QR,
        "ean13" to BarcodeFormat.EAN13,
        "ean8" to BarcodeFormat.EAN8,
        "code128" to BarcodeFormat.CODE128,
        "code39" to BarcodeFormat.CODE39,
        "upc_a" to BarcodeFormat.UPCA,
        "upc_e" to BarcodeFormat.UPCE,
        "pdf417" to BarcodeFormat.PDF417,
        "aztec" to BarcodeFormat.AZTEC,
        "datamatrix" to BarcodeFormat.DATAMATRIX,
        "itf14" to BarcodeFormat.ITF14,
        "itf" to BarcodeFormat.ITF14,
    )
    return map[type.lowercase()] ?: BarcodeFormat.CODE128
}

/**
 * Formats the Apple Watch companion renders natively. AZTEC / PDF417 / UPC-E /
 * DATAMATRIX fall back to "Open on phone" on both watch surfaces.
 */
fun BarcodeFormat.isWatchRenderable(): Boolean = when (this) {
    BarcodeFormat.QR,
    BarcodeFormat.EAN13,
    BarcodeFormat.EAN8,
    BarcodeFormat.CODE128,
    BarcodeFormat.CODE39,
    BarcodeFormat.UPCA,
    BarcodeFormat.ITF14,
    -> true
    BarcodeFormat.UPCE,
    BarcodeFormat.PDF417,
    BarcodeFormat.AZTEC,
    BarcodeFormat.DATAMATRIX,
    -> false
}

fun validateBarcode(code: String, format: BarcodeFormat): Boolean {
    val c = code.trim()
    if (c.isEmpty()) return false
    return when (format) {
        BarcodeFormat.EAN13 -> Regex("""^\d{13}$""").matches(c)
        BarcodeFormat.EAN8 -> Regex("""^\d{8}$""").matches(c)
        BarcodeFormat.UPCA -> Regex("""^\d{12}$""").matches(c)
        BarcodeFormat.UPCE -> Regex("""^\d{6,8}$""").matches(c)
        BarcodeFormat.CODE128, BarcodeFormat.CODE39 -> c.isNotEmpty()
        else -> true
    }
}

data class ScannedCode(
    val code: String,
    val format: BarcodeFormat,
)

/** EAN13 scans sometimes drop the leading zero (12 digits). */
fun fixScannedCode(code: String, format: BarcodeFormat): ScannedCode {
    if (format == BarcodeFormat.EAN13 && Regex("""^\d{12}$""").matches(code)) {
        return ScannedCode("0$code", BarcodeFormat.EAN13)
    }
    return ScannedCode(code, format)
}
