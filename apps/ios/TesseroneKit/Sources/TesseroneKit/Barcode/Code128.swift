import Foundation

/// CODE128 Code Set B (printable ASCII 32-126).
public enum Code128 {
    /// 107 codeword patterns. Codewords 0-105 each are 6 widths summing to
    /// 11 modules (alternating bar/space starting with bar). Codeword 106 is
    /// the stop pattern: 7 elements, 13 modules, ends with a bar.
    private static let patterns: [String] = [
        "212222", "222122", "222221", "121223", "121322",
        "131222", "122213", "122312", "132212", "221213",
        "221312", "231212", "112232", "122132", "122231",
        "113222", "123122", "123221", "223211", "221132",
        "221231", "213212", "223112", "312131", "311222",
        "321122", "321221", "312212", "322112", "322211",
        "212123", "212321", "232121", "111323", "131123",
        "131321", "112313", "132113", "132311", "211313",
        "231113", "231311", "112133", "112331", "132131",
        "113123", "113321", "133121", "313121", "211331",
        "231131", "213113", "213311", "213131", "311123",
        "311321", "331121", "312113", "312311", "332111",
        "314111", "221411", "431111", "111224", "111422",
        "121124", "121421", "141122", "141221", "112214",
        "112412", "122114", "122411", "142112", "142211",
        "241211", "221114", "413111", "241112", "134111",
        "111242", "121142", "121241", "114212", "124112",
        "124211", "411212", "421112", "421211", "212141",
        "214121", "412121", "111143", "111341", "131141",
        "114113", "114311", "411113", "411311", "113141",
        "114131", "311141", "411131", "211412", "211214",
        "211232",
        "2331112",
    ]

    private static let startB = 104
    private static let stop = 106

    public static func encode(_ input: String) -> [Bool]? {
        var codewords: [Int] = [startB]
        for ch in input {
            guard let scalar = ch.asciiValue, scalar >= 32, scalar <= 126 else {
                return nil
            }
            codewords.append(Int(scalar) - 32)
        }
        var sum = codewords[0]
        for i in 1..<codewords.count {
            sum += i * codewords[i]
        }
        codewords.append(sum % 103)
        codewords.append(stop)

        var bits: [Bool] = []
        for cw in codewords {
            let pattern = patterns[cw]
            for (j, ch) in pattern.enumerated() {
                let isBar = j.isMultiple(of: 2)
                guard let width = ch.wholeNumberValue else { return nil }
                bits.append(contentsOf: Array(repeating: isBar, count: width))
            }
        }
        return bits
    }
}
