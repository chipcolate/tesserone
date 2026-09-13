package com.chipcolate.tesserone.core

fun fixture(name: String): String {
    val loader = requireNotNull(Thread.currentThread().contextClassLoader) { "no class loader" }
    val stream = requireNotNull(loader.getResourceAsStream("fixtures/$name")) { "missing fixture $name" }
    return stream.bufferedReader().use { it.readText() }
}
