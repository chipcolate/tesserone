package com.chipcolate.tesserone.core.store

import com.chipcolate.tesserone.core.model.customLogoFilename
import java.io.File
import java.util.Base64
import java.util.UUID

private val DATA_URI = Regex("""^data:image/[a-zA-Z0-9+.-]+;base64,(.*)$""")

fun newCustomLogoFilename(): String {
    val rand = UUID.randomUUID().toString().replace("-", "").take(8)
    return "${System.currentTimeMillis()}-$rand.jpg"
}

fun writeCustomLogoFromDataUri(dataUri: String, logosDir: File): String? {
    val match = DATA_URI.find(dataUri) ?: return null
    return try {
        writeCustomLogoFromBytes(Base64.getDecoder().decode(match.groupValues[1]), logosDir)
    } catch (_: Exception) {
        null
    }
}

fun writeCustomLogoFromBytes(bytes: ByteArray, logosDir: File): String? {
    return try {
        logosDir.mkdirs()
        val filename = newCustomLogoFilename()
        File(logosDir, filename).writeBytes(bytes)
        filename
    } catch (_: Exception) {
        null
    }
}

fun writeCustomLogoFromStream(stream: java.io.InputStream, logosDir: File): String? {
    return try {
        writeCustomLogoFromBytes(stream.readBytes(), logosDir)
    } catch (_: Exception) {
        null
    }
}

fun deleteCustomLogoFile(stored: String?, logosDir: File) {
    val filename = customLogoFilename(stored) ?: return
    File(logosDir, filename).delete()
}

fun customLogoToDataUri(stored: String, logosDir: File): String? {
    val filename = customLogoFilename(stored) ?: return null
    val file = File(logosDir, filename)
    if (!file.isFile) return null
    return try {
        "data:image/jpeg;base64,${Base64.getEncoder().encodeToString(file.readBytes())}"
    } catch (_: Exception) {
        null
    }
}

fun copyExpoCustomLogos(filesDir: File) {
    val dest = WalletPaths.customLogosDir(filesDir)
    dest.mkdirs()
    for (src in WalletPaths.expoCustomLogoDirs(filesDir)) {
        if (!src.isDirectory || src.canonicalFile == dest.canonicalFile) continue
        src.listFiles()?.forEach { file ->
            if (file.isFile) {
                val target = File(dest, file.name)
                if (!target.exists()) file.copyTo(target)
            }
        }
    }
}
