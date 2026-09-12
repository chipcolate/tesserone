import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.colorScheme) private var systemScheme

    var body: some View {
        HomeView()
            .environment(\.palette, Palette(isDark: isDark))
            .environment(\.locale, Locale(identifier: model.resolvedLanguage))
            .preferredColorScheme(preferredScheme)
    }

    private var isDark: Bool {
        switch model.themeMode {
        case .dark: return true
        case .light: return false
        case .system: return systemScheme == .dark
        }
    }

    private var preferredScheme: ColorScheme? {
        switch model.themeMode {
        case .dark: return .dark
        case .light: return .light
        case .system: return nil
        }
    }
}
