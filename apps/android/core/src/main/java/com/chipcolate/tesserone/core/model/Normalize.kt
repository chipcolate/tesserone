package com.chipcolate.tesserone.core.model

private val LOWERCASE_FORMAT_MAP: Map<String, BarcodeFormat> = mapOf(
    "qr" to BarcodeFormat.QR,
    "ean13" to BarcodeFormat.EAN13,
    "ean8" to BarcodeFormat.EAN8,
    "code128" to BarcodeFormat.CODE128,
    "code39" to BarcodeFormat.CODE39,
    "upcA" to BarcodeFormat.UPCA,
    "upcE" to BarcodeFormat.UPCE,
    "pdf417" to BarcodeFormat.PDF417,
    "aztec" to BarcodeFormat.AZTEC,
    "datamatrix" to BarcodeFormat.DATAMATRIX,
    "itf" to BarcodeFormat.ITF14,
    "unknown" to BarcodeFormat.CODE128,
)

private val CANONICAL_FORMATS: Map<String, BarcodeFormat> =
    BarcodeFormat.entries.associateBy { it.name }

/** Expo import / migrator aliases. Unknown values become CODE128. */
fun normalizeFormat(input: String): BarcodeFormat {
    LOWERCASE_FORMAT_MAP[input]?.let { return it }
    return CANONICAL_FORMATS[input] ?: BarcodeFormat.CODE128
}

private val LEGACY_URI_FILENAME = Regex("""/custom-logos/([^/?#]+)$""")

/**
 * Bare filename from a stored custom-logo value.
 * Accepts a filename or a legacy `file://…/custom-logos/<name>` URI.
 */
fun customLogoFilename(stored: String?): String? {
    if (stored.isNullOrEmpty()) return null
    if (stored.contains('/')) {
        return LEGACY_URI_FILENAME.find(stored)?.groupValues?.get(1)
    }
    if (stored.contains("..")) return null
    return stored
}
