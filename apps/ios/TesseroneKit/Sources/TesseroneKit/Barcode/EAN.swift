import Foundation

/// EAN-13 / EAN-8 / UPC-A / UPC-E encoders. UPC-E is expanded to UPC-A.
public enum EAN {
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

    public static func encodeEAN13(_ input: String) -> [Bool]? {
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

    public static func encodeEAN8(_ input: String) -> [Bool]? {
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

    public static func encodeUPCA(_ input: String) -> [Bool]? {
        guard var d = parse(input, allowedLengths: [11, 12]) else { return nil }
        if d.count == 11 { d.append(checksum([0] + d)) }
        guard d.count == 12 else { return nil }
        let asString = "0" + d.map(String.init).joined()
        return encodeEAN13(asString)
    }

    /// Expand UPC-E to UPC-A, then encode.
    public static func encodeUPCE(_ input: String) -> [Bool]? {
        guard let upcA = expandUPCE(input) else { return nil }
        return encodeUPCA(upcA)
    }

    /// Returns the 12-digit UPC-A payload, or nil if the UPC-E data is invalid.
    public static func expandUPCE(_ input: String) -> String? {
        let digits = input.filter { !$0.isWhitespace }.compactMap(\.wholeNumberValue)
        guard digits.count == input.filter({ !$0.isWhitespace }).count else { return nil }

        let ns: Int
        let body: [Int]
        let check: Int?
        switch digits.count {
        case 6:
            ns = 0
            body = digits
            check = nil
        case 7:
            // NS + 6-digit body (no check) is the common scanner form.
            ns = digits[0]
            body = Array(digits.dropFirst())
            check = nil
        case 8:
            ns = digits[0]
            body = Array(digits.dropFirst().dropLast())
            check = digits[7]
        default:
            return nil
        }
        guard ns == 0 || ns == 1, body.count == 6 else { return nil }

        let w = body
        var manufacturer: [Int]
        var product: [Int]
        switch w[5] {
        case 0, 1, 2:
            manufacturer = [w[0], w[1], w[5], 0, 0]
            product = [0, 0, w[2], w[3], w[4]]
        case 3:
            manufacturer = [w[0], w[1], w[2], 0, 0]
            product = [0, 0, 0, w[3], w[4]]
        case 4:
            manufacturer = [w[0], w[1], w[2], w[3], 0]
            product = [0, 0, 0, 0, w[4]]
        default:
            manufacturer = [w[0], w[1], w[2], w[3], w[4]]
            product = [0, 0, 0, 0, w[5]]
        }

        let core = [ns] + manufacturer + product
        let computed = checksum(core)
        if let check, check != computed { return nil }
        return (core + [computed]).map(String.init).joined()
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
