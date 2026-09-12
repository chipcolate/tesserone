package com.chipcolate.tesserone.ui.components

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipcolate.tesserone.core.brands.BrandEntry
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.model.customLogoFilename
import com.chipcolate.tesserone.core.store.WalletPaths
import com.chipcolate.tesserone.ui.i18n.t
import com.chipcolate.tesserone.ui.theme.Accent
import com.chipcolate.tesserone.ui.theme.ChromeRadius
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.palette
import com.chipcolate.tesserone.ui.theme.parseHexColor
import com.chipcolate.tesserone.ui.theme.textOnColor
import java.io.File

@Composable
fun LogoSelector(
    logoSlug: String?,
    customLogoUri: String?,
    cardName: String,
    cardColor: String,
    brands: BrandIndex,
    filesDir: File,
    onCustomLogoPick: (Uri) -> Unit,
    onClear: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val palette = palette()
    val context = LocalContext.current
    val brand = logoSlug?.let { brands.get(it) }
    val hasAnyLogo = !logoSlug.isNullOrBlank() || !customLogoUri.isNullOrBlank()
    val bitmap = remember(logoSlug, customLogoUri, brands) {
        loadLogoBitmap(context, logoSlug, customLogoUri, brands, filesDir)
    }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) onCustomLogoPick(uri)
    }
    val label = when {
        brand != null -> brand.name
        !customLogoUri.isNullOrBlank() -> t("logoSelector.customLogo")
        else -> t("logoSelector.noLogo")
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            LogoTile(bitmap = bitmap, color = cardColor, name = cardName, size = 48.dp)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    color = colors.onSurface,
                    fontFamily = Mono.bold,
                    fontSize = 14.sp,
                    maxLines = 1,
                )
                if (hasAnyLogo) {
                    Text(
                        text = t("common.remove"),
                        color = palette.danger,
                        fontFamily = Mono.regular,
                        fontSize = 12.sp,
                        modifier = Modifier.clickable(onClick = onClear),
                    )
                }
            }
        }
        Box(
            modifier = Modifier
                .clip(ChromeRadius)
                .background(colors.surface)
                .border(1.dp, colors.outline, ChromeRadius)
                .clickable {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(
                text = if (!customLogoUri.isNullOrBlank()) {
                    t("logoSelector.replacePhoto")
                } else {
                    t("logoSelector.uploadPhoto")
                },
                color = colors.onSurface,
                fontFamily = Mono.medium,
                fontSize = 14.sp,
            )
        }
    }
}

@Composable
fun BrandResultList(
    results: List<BrandEntry>,
    selectedSlug: String?,
    onSelect: (BrandEntry) -> Unit,
) {
    if (results.isEmpty()) return
    val colors = MaterialTheme.colorScheme
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .padding(top = 12.dp)
            .clip(ChromeRadius)
            .border(1.dp, colors.outline, ChromeRadius),
    ) {
        results.forEachIndexed { idx, brand ->
            val selected = brand.slug == selectedSlug
            val logo = remember(brand.slug, brand.logo) { loadBrandAsset(context, brand.logo) }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (selected) colors.background else colors.surface)
                    .then(
                        if (idx > 0) {
                            Modifier.drawBehind {
                                drawLine(
                                    color = colors.outline,
                                    start = Offset(0f, 0f),
                                    end = Offset(size.width, 0f),
                                    strokeWidth = 1.dp.toPx(),
                                )
                            }
                        } else {
                            Modifier
                        },
                    )
                    .clickable { onSelect(brand) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                LogoTile(
                    bitmap = logo,
                    color = brand.primaryColor.ifBlank { "#333333" },
                    name = brand.name,
                    size = 40.dp,
                )
                Text(
                    text = brand.name,
                    color = colors.onSurface,
                    fontFamily = Mono.bold,
                    fontSize = 14.sp,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                )
                if (selected) {
                    Text(text = "✓", color = Accent, fontFamily = Mono.bold, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun LogoTile(
    bitmap: ImageBitmap?,
    color: String,
    name: String,
    size: androidx.compose.ui.unit.Dp,
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .size(size)
            .clip(ChromeRadius)
            .background(parseHexColor(color))
            .border(1.dp, colors.outline, ChromeRadius)
            .padding(4.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (bitmap != null) {
            Image(
                bitmap = bitmap,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
            )
        } else {
            Text(
                text = (name.firstOrNull()?.uppercaseChar() ?: '?').toString(),
                color = textOnColor(color),
                fontFamily = Mono.extraBold,
                fontSize = if (size >= 48.dp) 22.sp else 18.sp,
            )
        }
    }
}

fun loadLogoBitmap(
    context: Context,
    logoSlug: String?,
    customLogoUri: String?,
    brands: BrandIndex,
    filesDir: File,
): ImageBitmap? {
    val custom = customLogoFilename(customLogoUri)
    if (custom != null) {
        val file = File(WalletPaths.customLogosDir(filesDir), custom)
        if (file.isFile) {
            BitmapFactory.decodeFile(file.absolutePath)?.let { return it.asImageBitmap() }
        }
    }
    val filename = logoSlug?.let { brands.get(it)?.logo }.orEmpty()
    return loadBrandAsset(context, filename)
}

fun loadBrandAsset(context: Context, filename: String): ImageBitmap? {
    if (filename.isEmpty()) return null
    return try {
        context.assets.open("brands/logos/$filename").use { stream ->
            BitmapFactory.decodeStream(stream)?.asImageBitmap()
        }
    } catch (_: Exception) {
        null
    }
}
