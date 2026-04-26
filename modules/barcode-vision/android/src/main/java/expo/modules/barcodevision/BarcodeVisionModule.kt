package expo.modules.barcodevision

import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.InputStream

class BarcodeVisionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BarcodeVision")

    AsyncFunction("detectBarcodesInImage") { uri: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(emptyList<Map<String, String>>())
        return@AsyncFunction
      }

      val parsed = try {
        Uri.parse(uri)
      } catch (_: Exception) {
        null
      }

      val bitmap = try {
        when (parsed?.scheme) {
          null, "file" -> {
            val path = parsed?.path ?: uri.removePrefix("file://")
            BitmapFactory.decodeFile(path)
          }
          "content" -> context.contentResolver.openInputStream(parsed)?.use { stream: InputStream ->
            BitmapFactory.decodeStream(stream)
          }
          else -> null
        }
      } catch (_: Exception) {
        null
      }

      if (bitmap == null) {
        promise.resolve(emptyList<Map<String, String>>())
        return@AsyncFunction
      }

      val options = BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
        .build()
      val scanner = BarcodeScanning.getClient(options)
      val image = InputImage.fromBitmap(bitmap, 0)

      scanner.process(image)
        .addOnSuccessListener { barcodes ->
          val mapped = barcodes.mapNotNull { b ->
            val value = b.rawValue ?: return@mapNotNull null
            mapOf("data" to value, "type" to formatName(b.format))
          }
          promise.resolve(mapped)
        }
        .addOnFailureListener {
          promise.resolve(emptyList<Map<String, String>>())
        }
    }
  }

  private fun formatName(format: Int): String = when (format) {
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
}
