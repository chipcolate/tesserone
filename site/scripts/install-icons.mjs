import sharp from "sharp";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const REPO = resolve(import.meta.dirname, "..", "..");
const SVG_LIGHT = readFileSync(`${REPO}/assets/icon.svg`);
const SVG_DARK = readFileSync(`${REPO}/assets/icon-dark.svg`);

async function render(svg, size, outPath) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

async function pngBuffer(svg, size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// Watch-only sizes referenced by AppIcon.appiconset/Contents.json that aren't shipped in the new set
const WATCH_SIZES = [48, 55, 66, 88, 92, 102, 108, 172, 196, 216, 234, 258];
const APPICONSET = `${REPO}/AppIcons/Assets.xcassets/AppIcon.appiconset`;
for (const s of WATCH_SIZES) {
  await render(SVG_LIGHT, s, `${APPICONSET}/${s}.png`);
}

// README/project logo (was 240x240)
await render(SVG_LIGHT, 240, `${REPO}/assets/logo.png`);

// Expo web favicon (was 48x48, grayscale — upgrade to 64x64 RGBA so it reads)
await render(SVG_LIGHT, 64, `${REPO}/assets/favicon.png`);

// Android adaptive icon: white phone on transparent, padded to ~66% of canvas so the
// arms survive circular launcher masks (Android adaptive safe zone is center 66%).
{
  const size = 512;
  const inner = Math.round(size * 0.66);
  const pad = Math.round((size - inner) / 2);
  const fg = await pngBuffer(SVG_DARK, inner);
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fg, top: pad, left: pad }])
    .png()
    .toFile(`${REPO}/assets/adaptive-icon.png`);
}

// Site PWA icons
await render(SVG_LIGHT, 192, `${REPO}/site/public/icon-192.png`);
await render(SVG_LIGHT, 512, `${REPO}/site/public/icon-512.png`);
await render(SVG_LIGHT, 180, `${REPO}/site/public/apple-touch-icon.png`);

// Site favicon.ico — wrap a 32x32 PNG. ICO format with type=1 (icon), one PNG entry.
const ICO_SIZE = 32;
const pngData = await pngBuffer(SVG_LIGHT, ICO_SIZE);
const ico = Buffer.alloc(6 + 16 + pngData.length);
ico.writeUInt16LE(0, 0);   // reserved
ico.writeUInt16LE(1, 2);   // type: 1 = ICO
ico.writeUInt16LE(1, 4);   // count
ico.writeUInt8(ICO_SIZE === 256 ? 0 : ICO_SIZE, 6);  // width (0 = 256)
ico.writeUInt8(ICO_SIZE === 256 ? 0 : ICO_SIZE, 7);  // height
ico.writeUInt8(0, 8);      // palette size
ico.writeUInt8(0, 9);      // reserved
ico.writeUInt16LE(1, 10);  // color planes
ico.writeUInt16LE(32, 12); // bits per pixel
ico.writeUInt32LE(pngData.length, 14); // image size
ico.writeUInt32LE(22, 18); // image offset (6 + 16)
pngData.copy(ico, 22);
writeFileSync(`${REPO}/site/public/favicon.ico`, ico);

console.log("Generated: watch sizes, logo.png(240), favicon.png(64), site PWA icons, favicon.ico");
