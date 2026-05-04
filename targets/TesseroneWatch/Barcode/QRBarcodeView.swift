import SwiftUI
import QRCodeSwift

struct QRBarcodeView: View {
    let code: String

    var body: some View {
        if let matrix = try? QRCode(code).imageCodes {
            QRMatrixCanvas(matrix: matrix)
        } else {
            Text("Invalid QR data")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

private struct QRMatrixCanvas: View {
    let matrix: [[Bool]]

    var body: some View {
        Canvas { context, size in
            guard !matrix.isEmpty else { return }
            let n = matrix.count
            let side = min(size.width, size.height)
            let cell = side / CGFloat(n)
            let xOffset = (size.width - side) / 2
            let yOffset = (size.height - side) / 2
            for r in 0..<n {
                let row = matrix[r]
                var c = 0
                while c < row.count {
                    if row[c] {
                        var runEnd = c + 1
                        while runEnd < row.count && row[runEnd] { runEnd += 1 }
                        let rect = CGRect(
                            x: xOffset + CGFloat(c) * cell,
                            y: yOffset + CGFloat(r) * cell,
                            width: CGFloat(runEnd - c) * cell,
                            height: cell
                        )
                        context.fill(Path(rect), with: .color(.black))
                        c = runEnd
                    } else {
                        c += 1
                    }
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .background(Color.white)
    }
}
