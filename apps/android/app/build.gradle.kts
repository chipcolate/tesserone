plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

val sharedFonts = rootProject.projectDir.resolve("../../shared/fonts")
val generatedFontRes = layout.buildDirectory.dir("generated/shared-fonts")
val generatedWidgetRes = layout.buildDirectory.dir("generated/widget-previews")

val copyFonts by tasks.registering(Copy::class) {
    from(sharedFonts) {
        include("*.ttf")
        rename { filename -> filename.lowercase().replace("-", "_") }
    }
    into(generatedFontRes.map { it.dir("font") })
}

val copyWidgetPreviews by tasks.registering(Copy::class) {
    from(rootProject.projectDir.resolve("../../assets")) {
        include("widget-single-preview.png", "widget-list-preview.png")
        rename { it.replace("-", "_") }
    }
    into(generatedWidgetRes.map { it.dir("drawable") })
}

android {
    namespace = "com.chipcolate.tesserone"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.chipcolate.tesserone"
        minSdk = 26
        targetSdk = 35
        versionCode = 17
        versionName = "2.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    sourceSets {
        getByName("main") {
            // Existing density mipmaps from the Expo icon set.
            res.srcDir(rootProject.projectDir.resolve("../../AppIcons/android"))
            res.srcDir(generatedFontRes)
            res.srcDir(generatedWidgetRes)
        }
    }
}

kotlin {
    jvmToolchain(17)
}

tasks.configureEach {
    if (name == "preBuild" || name.matches(Regex("(?:generate|package|merge)(?:Debug|Release)Resources"))) {
        dependsOn(copyFonts)
        dependsOn(copyWidgetPreviews)
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.androidx.camera.mlkit)
    implementation(libs.mlkit.barcode.scanning)
    implementation(libs.androidx.glance.appwidget)
    implementation(libs.androidx.glance.material3)
    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.play.services.wearable)
    implementation(libs.kotlinx.coroutines.play.services)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
