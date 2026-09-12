package com.chipcolate.tesserone.ui.add

import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.mlkit.vision.MlKitAnalyzer
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.chipcolate.tesserone.core.barcode.ScannedCode
import com.chipcolate.tesserone.core.barcode.fixScannedCode
import com.chipcolate.tesserone.core.barcode.mapBarcodeType
import com.chipcolate.tesserone.core.barcode.mlKitFormatName
import com.chipcolate.tesserone.ui.i18n.t
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import java.util.concurrent.atomic.AtomicBoolean

@Composable
fun BarcodeScannerOverlay(
    onDetected: (ScannedCode) -> Unit,
    onCancel: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val handled = remember { AtomicBoolean(false) }
    val scanner = remember {
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
            .build()
        BarcodeScanning.getClient(options)
    }
    val controller = remember {
        LifecycleCameraController(context).apply {
            cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            setEnabledUseCases(CameraController.IMAGE_ANALYSIS)
        }
    }

    DisposableEffect(lifecycleOwner, scanner) {
        val executor = ContextCompat.getMainExecutor(context)
        controller.setImageAnalysisAnalyzer(
            executor,
            MlKitAnalyzer(
                listOf(scanner),
                ImageAnalysis.COORDINATE_SYSTEM_ORIGINAL,
                executor,
            ) { result ->
                val barcodes = result.getValue(scanner) ?: return@MlKitAnalyzer
                val first = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() } ?: return@MlKitAnalyzer
                if (!handled.compareAndSet(false, true)) return@MlKitAnalyzer
                val mapped = mapBarcodeType(mlKitFormatName(first.format))
                onDetected(fixScannedCode(first.rawValue!!.trim(), mapped))
            },
        )
        controller.bindToLifecycle(lifecycleOwner)
        onDispose {
            controller.clearImageAnalysisAnalyzer()
            controller.unbind()
            scanner.close()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .zIndex(300f)
            .background(Color.Black),
    ) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    this.controller = controller
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(width = 260.dp, height = 160.dp)
                    .border(2.dp, Color.White.copy(alpha = 0.6f), ChromeRadius),
            )
            Text(
                text = t("add.scanHint"),
                color = Color.White,
                fontFamily = Mono.medium,
                fontSize = 14.sp,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(top = 192.dp),
            )
        }
        Box(
            modifier = Modifier
                .statusBarsPadding()
                .padding(start = 12.dp, top = 12.dp)
                .size(40.dp)
                .clip(ChromeRadius)
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable(onClick = onCancel),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "✕", color = Color.White, fontFamily = Mono.regular, fontSize = 20.sp)
        }
    }
}
