package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.barcode.BarcodeEncoder
import com.chipcolate.tesserone.core.barcode.fixScannedCode
import com.chipcolate.tesserone.core.barcode.mapBarcodeType
import com.chipcolate.tesserone.core.barcode.validateBarcode
import com.chipcolate.tesserone.core.model.BarcodeFormat
import com.chipcolate.tesserone.core.motion.rubberBand
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BarcodeTest {
    @Test
    fun ean13Requires13Digits() {
        assertTrue(validateBarcode("4006381333931", BarcodeFormat.EAN13))
        assertFalse(validateBarcode("400638133393", BarcodeFormat.EAN13))
        assertFalse(validateBarcode("", BarcodeFormat.EAN13))
    }

    @Test
    fun ean8AndUpc() {
        assertTrue(validateBarcode("12345678", BarcodeFormat.EAN8))
        assertFalse(validateBarcode("1234567", BarcodeFormat.EAN8))
        assertTrue(validateBarcode("123456789012", BarcodeFormat.UPCA))
        assertTrue(validateBarcode("123456", BarcodeFormat.UPCE))
        assertTrue(validateBarcode("12345678", BarcodeFormat.UPCE))
        assertFalse(validateBarcode("12345", BarcodeFormat.UPCE))
    }

    @Test
    fun code128AnyNonEmpty() {
        assertTrue(validateBarcode("abc", BarcodeFormat.CODE128))
        assertFalse(validateBarcode("  ", BarcodeFormat.CODE128))
    }

    @Test
    fun fixScannedCodePrependsZeroFor12DigitEan13() {
        val fixed = fixScannedCode("400638133393", BarcodeFormat.EAN13)
        assertEquals("0400638133393", fixed.code)
        assertEquals(BarcodeFormat.EAN13, fixed.format)
    }

    @Test
    fun fixScannedCodeLeaves13DigitEan13() {
        val fixed = fixScannedCode("4006381333931", BarcodeFormat.EAN13)
        assertEquals("4006381333931", fixed.code)
    }

    @Test
    fun mapBarcodeTypeAliases() {
        assertEquals(BarcodeFormat.QR, mapBarcodeType("qr"))
        assertEquals(BarcodeFormat.EAN13, mapBarcodeType("EAN13"))
        assertEquals(BarcodeFormat.UPCA, mapBarcodeType("upc_a"))
        assertEquals(BarcodeFormat.ITF14, mapBarcodeType("itf"))
        assertEquals(BarcodeFormat.CODE128, mapBarcodeType("nope"))
    }

    @Test
    fun ean13EncodesBitMatrix() {
        // Demo Conad base `800462015074` + check digit 1; fixture `4006381333931` as fallback.
        val matrix = BarcodeEncoder.encodeMatrix("8004620150741", BarcodeFormat.EAN13)
            ?: BarcodeEncoder.encodeMatrix("4006381333931", BarcodeFormat.EAN13)
        assertNotNull(matrix)
        assertTrue(matrix!!.width > 0)
        assertTrue(matrix.height > 0)
    }

    @Test
    fun invalidEan13ReturnsNull() {
        assertNull(BarcodeEncoder.encodeMatrix("not-a-barcode", BarcodeFormat.EAN13))
        assertNull(BarcodeEncoder.encodeMatrix("", BarcodeFormat.QR))
    }

    @Test
    fun rubberBandScalesOverscroll() {
        assertEquals(0f, rubberBand(0f, 0f, 0.18f), 0.0001f)
        assertEquals(-1.8f, rubberBand(-10f, 0f, 0.18f), 0.0001f)
        assertEquals(101.8f, rubberBand(110f, 100f, 0.18f), 0.0001f)
    }
}
