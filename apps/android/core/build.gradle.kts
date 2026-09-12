plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
}

val sharedBrands = rootProject.projectDir.resolve("../../shared/brands")
val sharedI18n = rootProject.projectDir.resolve("../../shared/i18n")
val generatedAssets = layout.buildDirectory.dir("generated/assets")

val copyBrandAssets by tasks.registering(Copy::class) {
    from(sharedBrands) {
        include("brand-index.json")
        include("logos/**")
    }
    into(generatedAssets.map { it.dir("brands") })
}

val copyI18nAssets by tasks.registering(Copy::class) {
    from(sharedI18n) {
        include("*.json")
    }
    into(generatedAssets.map { it.dir("i18n") })
}

android {
    namespace = "com.chipcolate.tesserone.core"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main") {
            assets.srcDir(generatedAssets)
        }
        getByName("test") {
            resources.srcDir(rootProject.projectDir.resolve("../../shared"))
        }
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

kotlin {
    jvmToolchain(17)
}

tasks.configureEach {
    if (name == "preBuild" || name.matches(Regex("(?:generate|package|merge)(?:Debug|Release)Assets"))) {
        dependsOn(copyBrandAssets)
        dependsOn(copyI18nAssets)
    }
}

dependencies {
    api(libs.kotlinx.serialization.json)
    api(libs.kotlinx.coroutines.core)
    implementation(libs.zxing.core)
    implementation(libs.mlkit.barcode.scanning)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
