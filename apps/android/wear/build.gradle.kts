plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

val sharedFonts = rootProject.projectDir.resolve("../../shared/fonts")
val generatedFontRes = layout.buildDirectory.dir("generated/shared-fonts")

val copyFonts by tasks.registering(Copy::class) {
    from(sharedFonts) {
        include("*.ttf")
        rename { filename -> filename.lowercase().replace("-", "_") }
    }
    into(generatedFontRes.map { it.dir("font") })
}

android {
    namespace = "com.chipcolate.tesserone.wear"
    compileSdk = 35

    defaultConfig {
        // Same applicationId as the phone app so the Wearable Data Layer can
        // sync. Distinguishes itself via android.hardware.type.watch.
        applicationId = "com.chipcolate.tesserone"
        minSdk = 30
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
    }

    sourceSets {
        getByName("main") {
            res.srcDir(rootProject.projectDir.resolve("../../AppIcons/android"))
            res.srcDir(generatedFontRes)
        }
    }
}

kotlin {
    jvmToolchain(17)
}

tasks.configureEach {
    if (name == "preBuild" || name.matches(Regex("(?:generate|package|merge)(?:Debug|Release)Resources"))) {
        dependsOn(copyFonts)
    }
}

dependencies {
    implementation(project(":core")) {
        exclude(group = "com.google.mlkit")
    }
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.wear.compose.material)
    implementation(libs.androidx.wear.compose.foundation)
    implementation(libs.androidx.wear.compose.navigation)
    implementation(libs.play.services.wearable)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
