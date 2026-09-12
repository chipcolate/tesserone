import Foundation

/// Tiny nested-key translator for `shared/i18n/{en,it,fr,es,de}.json`.
///
/// Keys are dotted (`add.methodScanTitle`). `{{name}}` / `{{count}}` / `{{format}}`
/// (and any other `{{token}}`) are replaced from the interpolations dictionary.
/// When `count` is provided, `_one` is used for 1 and `_other` otherwise.
public final class L10n: @unchecked Sendable {
    public static let supportedLanguages = ["en", "it", "fr", "es", "de"]
    public static let fallbackLanguage = "en"

    public let language: String
    private let table: [String: Any]

    public init(language: String, table: [String: Any]) {
        self.language = language
        self.table = table
    }

    public convenience init(language: String, json: Data) throws {
        let object = try JSONSerialization.jsonObject(with: json)
        guard let table = object as? [String: Any] else { throw TesseroneError.malformedJSON }
        self.init(language: language, table: table)
    }

    public static func resolveLanguage(
        _ preference: LanguagePreference,
        preferredLanguages: [String] = Locale.preferredLanguages
    ) -> String {
        switch preference {
        case .en, .it, .fr, .es, .de:
            return preference.rawValue
        case .system:
            for tag in preferredLanguages {
                let primary = primaryCode(tag)
                if supportedLanguages.contains(primary) { return primary }
            }
            return fallbackLanguage
        }
    }

    /// Loads `<language>.json` from an `i18n` subdirectory (or the bundle root).
    /// Falls back to English, then to an empty table.
    public static func load(language: String, bundle: Bundle = .main) -> L10n {
        if let loaded = loadExact(language: language, bundle: bundle) { return loaded }
        if language != fallbackLanguage, let en = loadExact(language: fallbackLanguage, bundle: bundle) {
            return en
        }
        return L10n(language: language, table: [:])
    }

    public static func load(
        preference: LanguagePreference,
        bundle: Bundle = .main,
        preferredLanguages: [String] = Locale.preferredLanguages
    ) -> L10n {
        load(language: resolveLanguage(preference, preferredLanguages: preferredLanguages), bundle: bundle)
    }

    public func t(_ key: String, _ interpolations: [String: String] = [:], count: Int? = nil) -> String {
        var vars = interpolations
        if let count, vars["count"] == nil {
            vars["count"] = String(count)
        }
        if let count {
            let suffix = count == 1 ? "_one" : "_other"
            if let template = lookup(key + suffix) {
                return interpolate(template, vars: vars)
            }
        }
        if let template = lookup(key) {
            return interpolate(template, vars: vars)
        }
        return key
    }

    private func lookup(_ key: String) -> String? {
        let parts = key.split(separator: ".").map(String.init)
        guard !parts.isEmpty else { return nil }
        var current: Any = table
        for part in parts {
            guard let dict = current as? [String: Any], let next = dict[part] else { return nil }
            current = next
        }
        return current as? String
    }

    private func interpolate(_ template: String, vars: [String: String]) -> String {
        var out = template
        for (name, value) in vars {
            out = out.replacingOccurrences(of: "{{\(name)}}", with: value)
        }
        return out
    }

    private static func primaryCode(_ tag: String) -> String {
        let cut = tag.firstIndex(where: { $0 == "-" || $0 == "_" }) ?? tag.endIndex
        return String(tag[..<cut]).lowercased()
    }

    private static func loadExact(language: String, bundle: Bundle) -> L10n? {
        let urls = [
            bundle.url(forResource: language, withExtension: "json", subdirectory: "i18n"),
            bundle.url(forResource: language, withExtension: "json"),
        ]
        guard let url = urls.compactMap({ $0 }).first, let data = try? Data(contentsOf: url) else {
            return nil
        }
        return try? L10n(language: language, json: data)
    }
}
