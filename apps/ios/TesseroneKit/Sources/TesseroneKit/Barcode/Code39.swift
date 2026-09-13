import Foundation

public enum Code39 {
    /// Each entry is 9 chars: bars + spaces alternating, where 'n' = narrow
    /// (1 unit) and 'w' = wide (~2.5-3 units). Per CODE39, every char has
    /// 5 bars and 4 spaces with exactly 3 wide elements.
    private static let table: [(Character, String)] = [
        ("0", "nnnwwnwnn"), ("1", "wnnwnnnnw"), ("2", "nnwwnnnnw"),
        ("3", "wnwwnnnnn"), ("4", "nnnwwnnnw"), ("5", "wnnwwnnnn"),
        ("6", "nnwwwnnnn"), ("7", "nnnwnnwnw"), ("8", "wnnwnnwnn"),
        ("9", "nnwwnnwnn"),
        ("A", "wnnnnwnnw"), ("B", "nnwnnwnnw"), ("C", "wnwnnwnnn"),
        ("D", "nnnnwwnnw"), ("E", "wnnnwwnnn"), ("F", "nnwnwwnnn"),
        ("G", "nnnnnwwnw"), ("H", "wnnnnwwnn"), ("I", "nnwnnwwnn"),
        ("J", "nnnnwwwnn"),
        ("K", "wnnnnnnww"), ("L", "nnwnnnnww"), ("M", "wnwnnnnwn"),
        ("N", "nnnnwnnww"), ("O", "wnnnwnnwn"), ("P", "nnwnwnnwn"),
        ("Q", "nnnnnnwww"), ("R", "wnnnnnwwn"), ("S", "nnwnnnwwn"),
        ("T", "nnnnwnwwn"),
        ("U", "wwnnnnnnw"), ("V", "nwwnnnnnw"), ("W", "wwwnnnnnn"),
        ("X", "nwnnwnnnw"), ("Y", "wwnnwnnnn"), ("Z", "nwwnwnnnn"),
        ("-", "nwnnnnwnw"), (".", "wwnnnnwnn"), (" ", "nwwnnnwnn"),
        ("$", "nwnwnwnnn"), ("/", "nwnwnnnwn"), ("+", "nwnnnwnwn"),
        ("%", "nnnwnwnwn"),
        ("*", "nwnnwnwnn"),
    ]

    private static let lookup: [Character: String] = Dictionary(uniqueKeysWithValues: table)

    public static func encode(_ input: String) -> [Bool]? {
        let upper = input.uppercased()
        let chars: [Character] = ["*"] + Array(upper) + ["*"]
        var bits: [Bool] = []
        for (i, ch) in chars.enumerated() {
            guard let pattern = lookup[ch] else { return nil }
            for (j, kind) in pattern.enumerated() {
                let isBar = j % 2 == 0
                let units = (kind == "w") ? 3 : 1
                bits.append(contentsOf: Array(repeating: isBar, count: units))
            }
            if i < chars.count - 1 {
                bits.append(false)
            }
        }
        return bits
    }
}
