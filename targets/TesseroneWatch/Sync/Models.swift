import Foundation

let WATCH_SCHEMA_VERSION: Int = 1

enum WatchSortMode: String, Codable {
    case manual
    case alphabetical
    case dateCreated
}

enum WatchThemeMode: String, Codable {
    case system
    case light
    case dark
}

enum WatchBarcodeFormat: String, Codable {
    case QR
    case EAN13
    case EAN8
    case CODE128
    case CODE39
    case UPCA
    case UPCE
    case PDF417
    case AZTEC
    case DATAMATRIX
    case ITF14
}

struct WatchSnapshotCard: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let code: String
    let format: WatchBarcodeFormat
    let color: String?
    let logoSlug: String?
    let hasCustomLogo: Bool
    let sortIndex: Int
    let createdAt: String
    let updatedAt: String

    var logoKey: String? {
        if hasCustomLogo { return "custom:\(id)" }
        if let slug = logoSlug { return "bundled:\(slug)" }
        return nil
    }
}

struct WatchSnapshot: Codable {
    let schemaVersion: Int
    let cards: [WatchSnapshotCard]
    let sortMode: WatchSortMode
    let themeMode: WatchThemeMode
}
