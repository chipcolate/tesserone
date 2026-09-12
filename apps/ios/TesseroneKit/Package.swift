// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "TesseroneKit",
    platforms: [
        .iOS(.v17),
        .watchOS(.v10),
        .macOS(.v13),
    ],
    products: [
        .library(name: "TesseroneKit", targets: ["TesseroneKit"]),
    ],
    targets: [
        .target(name: "TesseroneKit"),
        .testTarget(
            name: "TesseroneKitTests",
            dependencies: ["TesseroneKit"],
            resources: [
                .copy("Fixtures"),
            ]
        ),
    ],
    swiftLanguageVersions: [.v5]
)
