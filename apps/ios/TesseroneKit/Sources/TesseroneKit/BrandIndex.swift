import Foundation

public struct BrandIndex: Sendable {
    public var brands: [BrandEntry]

    public init(brands: [BrandEntry]) {
        self.brands = brands
    }

    public init(data: Data) throws {
        brands = try JSONDecoder().decode([BrandEntry].self, from: data)
    }

    public init(url: URL) throws {
        try self.init(data: Data(contentsOf: url))
    }

    public static func loadFromBundle(_ bundle: Bundle = .main) throws -> BrandIndex {
        let candidates = [
            bundle.url(forResource: "brand-index", withExtension: "json", subdirectory: "brands"),
            bundle.url(forResource: "brand-index", withExtension: "json"),
        ]
        guard let url = candidates.compactMap({ $0 }).first else {
            throw TesseroneError.brandIndexMissing
        }
        return try BrandIndex(url: url)
    }

    public func brand(slug: String) -> BrandEntry? {
        brands.first { $0.slug == slug }
    }

    /// Case-insensitive substring match on name and aliases, ranked so exact/prefix
    /// hits beat mid-string matches (a light Fuse-style score). Empty query returns
    /// the full index. Non-empty queries are capped at `limit`.
    public func search(_ query: String, limit: Int = 10) -> [BrandEntry] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return brands }
        let options: String.CompareOptions = [.caseInsensitive, .diacriticInsensitive]
        struct Ranked {
            var brand: BrandEntry
            var score: Int
        }
        var ranked: [Ranked] = []
        ranked.reserveCapacity(min(brands.count, 32))
        for brand in brands {
            var best: Int?
            func consider(_ haystack: String, penalty: Int) {
                guard let range = haystack.range(of: trimmed, options: options) else { return }
                let prefix = range.lowerBound == haystack.startIndex
                let exact = prefix && range.upperBound == haystack.endIndex
                let score = (exact ? 0 : prefix ? 10 : 20) + penalty
                best = min(best ?? score, score)
            }
            consider(brand.name, penalty: 0)
            for alias in brand.aliases {
                consider(alias, penalty: 5)
            }
            if let score = best {
                ranked.append(Ranked(brand: brand, score: score))
            }
        }
        ranked.sort {
            if $0.score != $1.score { return $0.score < $1.score }
            return $0.brand.name.localizedStandardCompare($1.brand.name) == .orderedAscending
        }
        if ranked.count <= limit { return ranked.map(\.brand) }
        return Array(ranked.prefix(limit).map(\.brand))
    }
}
