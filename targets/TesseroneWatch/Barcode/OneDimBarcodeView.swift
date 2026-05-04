import SwiftUI

/// Renders a 1D barcode bar pattern (true = bar / black, false = space / white).
/// Uses Canvas with run-length-merged rects for pixel-crisp edges.
struct OneDimBarcodeView: View {
    let pattern: [Bool]

    var body: some View {
        Canvas { context, size in
            guard !pattern.isEmpty else { return }
            let unit = size.width / CGFloat(pattern.count)
            var runStart = 0
            var runIsBar = pattern[0]
            for i in 1..<pattern.count {
                if pattern[i] == runIsBar { continue }
                if runIsBar {
                    fillRun(runStart, end: i, unit: unit, height: size.height, in: context)
                }
                runStart = i
                runIsBar = pattern[i]
            }
            if runIsBar {
                fillRun(runStart, end: pattern.count, unit: unit, height: size.height, in: context)
            }
        }
        .background(Color.white)
    }

    private func fillRun(_ start: Int, end: Int, unit: CGFloat, height: CGFloat,
                         in context: GraphicsContext) {
        let rect = CGRect(x: CGFloat(start) * unit, y: 0,
                          width: CGFloat(end - start) * unit, height: height)
        context.fill(Path(rect), with: .color(.black))
    }
}
