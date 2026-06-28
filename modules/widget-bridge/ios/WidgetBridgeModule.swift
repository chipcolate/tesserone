import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    // Write the snapshot JSON atomically into the shared App Group container so
    // the WidgetKit extension (a separate process) can read it.
    AsyncFunction("writeSnapshot") { (appGroup: String, json: String) -> Bool in
      guard let dir = Self.widgetsDir(appGroup),
            let data = json.data(using: .utf8) else { return false }
      let url = dir.appendingPathComponent("snapshot.json")
      do {
        try data.write(to: url, options: .atomic)
        return true
      } catch {
        return false
      }
    }

    // Copy a logo image into the App Group's logos dir, keyed by its stable logo
    // key (`bundled:<slug>` / `custom:<id>`, with `:` sanitized to `_`).
    AsyncFunction("copyLogo") { (appGroup: String, key: String, srcUri: String) -> Bool in
      guard let dir = Self.logosDir(appGroup),
            let src = Self.fileURL(srcUri),
            let data = try? Data(contentsOf: src) else { return false }
      let dest = dir.appendingPathComponent(Self.sanitize(key) + ".png")
      do {
        try data.write(to: dest, options: .atomic)
        return true
      } catch {
        return false
      }
    }

    // Remove any logo files whose key is no longer referenced (deleted cards or
    // changed logos), keeping the shared container from growing unbounded.
    AsyncFunction("pruneLogos") { (appGroup: String, keepKeys: [String]) in
      guard let dir = Self.logosDir(appGroup) else { return }
      let keep = Set(keepKeys.map { Self.sanitize($0) + ".png" })
      let fm = FileManager.default
      let items = (try? fm.contentsOfDirectory(atPath: dir.path)) ?? []
      for item in items where !keep.contains(item) {
        try? fm.removeItem(at: dir.appendingPathComponent(item))
      }
    }

    Function("reloadWidgets") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }

  private static func container(_ appGroup: String) -> URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
  }

  private static func widgetsDir(_ appGroup: String) -> URL? {
    guard let c = container(appGroup) else { return nil }
    let dir = c.appendingPathComponent("widgets", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  private static func logosDir(_ appGroup: String) -> URL? {
    guard let w = widgetsDir(appGroup) else { return nil }
    let dir = w.appendingPathComponent("logos", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  private static func fileURL(_ uri: String) -> URL? {
    if uri.hasPrefix("file://") { return URL(string: uri) }
    return URL(fileURLWithPath: uri)
  }

  private static func sanitize(_ key: String) -> String {
    key.replacingOccurrences(of: ":", with: "_")
  }
}
