import Foundation

final class SnapshotStore: ObservableObject {
    @Published private(set) var snapshot: WatchSnapshot?

    private let url: URL = {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("snapshot.json")
    }()

    init() {
        loadFromDisk()
    }

    func update(from data: [String: Any]) {
        do {
            let json = try JSONSerialization.data(withJSONObject: data)
            let snap = try JSONDecoder().decode(WatchSnapshot.self, from: json)
            try? json.write(to: url, options: .atomic)
            DispatchQueue.main.async { [weak self] in
                self?.snapshot = snap
            }
        } catch {
            NSLog("[TesseroneWatch] snapshot decode failed: %@", error.localizedDescription)
        }
    }

    var sortedCards: [WatchSnapshotCard] {
        guard let snap = snapshot else { return [] }
        switch snap.sortMode {
        case .manual:
            return snap.cards.sorted { $0.sortIndex < $1.sortIndex }
        case .alphabetical:
            return snap.cards.sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
        case .dateCreated:
            return snap.cards.sorted { $0.createdAt > $1.createdAt }
        }
    }

    private func loadFromDisk() {
        guard let data = try? Data(contentsOf: url) else { return }
        snapshot = try? JSONDecoder().decode(WatchSnapshot.self, from: data)
    }
}
