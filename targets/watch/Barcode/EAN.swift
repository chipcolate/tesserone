import Foundation

/// EAN-13 / EAN-8 / UPC-A encoders. UPC-E expansion is intentionally deferred
/// (rare for loyalty cards); UPC-E codes fall through to "open on phone."
enum EAN {
    private static let lPatterns: [String] = [
        "0001101", "0011001", "0010011", "0111101", "0100011",
        "0110001", "0101111", "0111011", "0110111", "0001011",
    ]
    private static let rPatterns: [String] = lPatterns.map(complement)
    private static let gPatterns: [String] = rPatterns.map { String($0.reversed()) }

    private static let parityTable: [String] = [
        "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
        "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
    ]

    static func encodeEAN13(_ input: String) -> [Bool]? {
        guard var d = parse(input, allowedLengths: [12, 13]) else { return nil }
        if d.count == 12 { d.append(checksum(d)) }
        guard d.count == 13, checksum(Array(d.prefix(12))) == d[12] else { return nil }

        let leading = d[0]
        let parity = Array(parityTable[leading])
        var bits: [Bool] = bitsOf("101")
        for i in 0..<6 {
            let pattern: String
            switch parity[i] {
            case "L": pattern = lPatterns[d[i + 1]]
            case "G": pattern = gPatterns[d[i + 1]]
            default: return nil
            }
            bits.append(contentsOf: bitsOf(pattern))
        }
        bits.append(contentsOf: bitsOf("01010"))
        for i in 0..<6 {
            bits.append(contentsOf: bitsOf(rPatterns[d[i + 7]]))
        }
        bits.append(contentsOf: bitsOf("101"))
        return bits
    }

    static func encodeEAN8(_ input: String) -> [Bool]? {
        guard var d = parse(input, allowedLengths: [7, 8]) else { return nil }
        if d.count == 7 { d.append(checksum8(d)) }
        guard d.count == 8, checksum8(Array(d.prefix(7))) == d[7] else { return nil }

        var bits: [Bool] = bitsOf("101")
        for i in 0..<4 {
            bits.append(contentsOf: bitsOf(lPatterns[d[i]]))
        }
        bits.append(contentsOf: bitsOf("01010"))
        for i in 0..<4 {
            bits.append(contentsOf: bitsOf(rPatterns[d[i + 4]]))
        }
        bits.append(contentsOf: bitsOf("101"))
        return bits
    }

    static func encodeUPCA(_ input: String) -> [Bool]? {
        // UPC-A == EAN-13 with leading 0.
        guard var d = parse(input, allowedLengths: [11, 12]) else { return nil }
        if d.count == 11 { d.append(checksum([0] + d)) }
        guard d.count == 12 else { return nil }
        let asString = "0" + d.map(String.init).joined()
        return encodeEAN13(asString)
    }

    private static func parse(_ input: String, allowedLengths: [Int]) -> [Int]? {
        let digits = input.compactMap { $0.wholeNumberValue }
        guard digits.count == input.filter({ !$0.isWhitespace }).count else { return nil }
        guard allowedLengths.contains(digits.count) else { return nil }
        return digits
    }

    /// EAN-13 / UPC-A check digit. `d` is 12 digits (left-to-right).
    private static func checksum(_ d: [Int]) -> Int {
        let sum = d.enumerated().reduce(0) { acc, pair in
            acc + pair.element * (pair.offset.isMultiple(of: 2) ? 1 : 3)
        }
        let mod = sum % 10
        return mod == 0 ? 0 : 10 - mod
    }

    /// EAN-8 check digit. `d` is 7 digits (left-to-right).
    private static func checksum8(_ d: [Int]) -> Int {
        let sum = d.enumerated().reduce(0) { acc, pair in
            acc + pair.element * (pair.offset.isMultiple(of: 2) ? 3 : 1)
        }
        let mod = sum % 10
        return mod == 0 ? 0 : 10 - mod
    }

    private static func complement(_ s: String) -> String {
        String(s.map { $0 == "0" ? "1" : "0" })
    }

    private static func bitsOf(_ s: String) -> [Bool] {
        s.map { $0 == "1" }
    }
}
