import Foundation

/// Interleaved 2 of 5, fixed 14-digit length per ITF-14 spec.
public enum ITF14 {
    private static let patterns: [String] = [
        "nnwwn", "wnnnw", "nwnnw", "wwnnn", "nnwnw",
        "wnwnn", "nwwnn", "nnnww", "wnnwn", "nwnwn",
    ]

    public static func encode(_ input: String) -> [Bool]? {
        let digits = input.compactMap { $0.wholeNumberValue }
        guard digits.count == input.filter({ !$0.isWhitespace }).count else { return nil }

        var d = digits
        if d.count == 13 { d.append(checksum(d)) }
        guard d.count == 14, checksum(Array(d.prefix(13))) == d[13] else { return nil }

        var bits: [Bool] = [true, false, true, false]
        for i in stride(from: 0, to: 14, by: 2) {
            let barPattern = patterns[d[i]]
            let spacePattern = patterns[d[i + 1]]
            for j in 0..<5 {
                let barUnits: Int = barPattern[barPattern.index(barPattern.startIndex, offsetBy: j)] == "w" ? 3 : 1
                bits.append(contentsOf: Array(repeating: true, count: barUnits))
                let spaceUnits: Int = spacePattern[spacePattern.index(spacePattern.startIndex, offsetBy: j)] == "w" ? 3 : 1
                bits.append(contentsOf: Array(repeating: false, count: spaceUnits))
            }
        }
        bits.append(contentsOf: [true, true, true])
        bits.append(false)
        bits.append(true)
        return bits
    }

    private static func checksum(_ d: [Int]) -> Int {
        let sum = d.enumerated().reduce(0) { acc, pair in
            acc + pair.element * (pair.offset.isMultiple(of: 2) ? 3 : 1)
        }
        let mod = sum % 10
        return mod == 0 ? 0 : 10 - mod
    }
}
