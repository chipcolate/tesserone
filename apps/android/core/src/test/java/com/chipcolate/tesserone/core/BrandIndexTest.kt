package com.chipcolate.tesserone.core

import com.chipcolate.tesserone.core.brands.BrandIndex
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BrandIndexTest {
    private val index = BrandIndex.fromJson(
        """
        [
          {"slug":"esselunga","name":"Esselunga","aliases":["esselunga"],"alt":"","primaryColor":"#00205b","secondaryColor":"#e30613","logo":"esselunga.png"},
          {"slug":"lidl","name":"Lidl","aliases":["lidl"],"alt":"","primaryColor":"#0050aa","secondaryColor":"#eceff1","logo":"lidl.png"}
        ]
        """.trimIndent(),
    )

    @Test
    fun containsSearchMatchesNameAndAlias() {
        assertEquals("esselunga", index.search("esse")[0].slug)
        assertEquals("lidl", index.search("LIDL")[0].slug)
        assertTrue(index.search("zzz").isEmpty())
        assertTrue(index.search("  ").isEmpty())
    }

    @Test
    fun getBySlug() {
        assertEquals("Esselunga", index.get("esselunga")!!.name)
    }

    @Test
    fun cardBackgroundPrefersExplicitThenBrandThenFallback() {
        assertEquals("#42A5F5", index.cardBackground("#42A5F5", "esselunga"))
        assertEquals("#00205b", index.cardBackground(null, "esselunga"))
        assertEquals(BrandIndex.FALLBACK_CARD_BG, index.cardBackground(null, null))
    }
}
