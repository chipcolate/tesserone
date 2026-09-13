package com.chipcolate.tesserone.ui.wallet

import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipcolate.tesserone.core.brands.BrandIndex
import com.chipcolate.tesserone.core.model.FidelityCard
import com.chipcolate.tesserone.core.model.customLogoFilename
import com.chipcolate.tesserone.core.store.WalletPaths
import com.chipcolate.tesserone.ui.theme.Mono
import com.chipcolate.tesserone.ui.theme.parseHexColor
import com.chipcolate.tesserone.ui.theme.textOnColor
import java.io.File

@Composable
fun CardFace(
    card: FidelityCard,
    brands: BrandIndex,
    filesDir: File,
    modifier: Modifier = Modifier,
) {
    val bgHex = brands.cardBackground(card.color, card.logoSlug)
    val fg = textOnColor(bgHex)
    val context = LocalContext.current
    val logo = remember(card.id, card.logoSlug, card.customLogoUri, brands) {
        loadCardLogo(context, card, brands, filesDir)
    }
    Box(
        modifier = modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(CardStackDp.CARD_RADIUS.dp))
            .background(parseHexColor(bgHex))
            .padding(20.dp),
        contentAlignment = Alignment.TopStart,
    ) {
        if (logo != null) {
            Image(
                bitmap = logo,
                contentDescription = "${card.name} logo",
                modifier = Modifier.size(width = 160.dp, height = 48.dp),
                contentScale = ContentScale.Fit,
                alignment = Alignment.CenterStart,
            )
        } else {
            Text(
                text = card.name,
                color = fg,
                fontFamily = Mono.extraBold,
                fontSize = 30.sp,
                lineHeight = 36.sp,
                letterSpacing = (-1).sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

fun loadCardLogo(
    context: Context,
    card: FidelityCard,
    brands: BrandIndex,
    filesDir: File,
): ImageBitmap? {
    val custom = customLogoFilename(card.customLogoUri)
    if (custom != null) {
        val file = File(WalletPaths.customLogosDir(filesDir), custom)
        if (file.isFile) {
            BitmapFactory.decodeFile(file.absolutePath)?.let { return it.asImageBitmap() }
        }
    }
    val filename = card.logoSlug?.let { brands.get(it)?.logo }.orEmpty()
    if (filename.isEmpty()) return null
    return try {
        context.assets.open("brands/logos/$filename").use { stream ->
            BitmapFactory.decodeStream(stream)?.asImageBitmap()
        }
    } catch (_: Exception) {
        null
    }
}
