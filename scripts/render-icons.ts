/**
 * Rasterizes the 05 "bracket stack" logo SVGs into the app icon assets.
 * Run: bun run scripts/render-icons.ts
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.env.HOME!, 'Documents/tesserone-logo-proposals/05-final');
const ASSETS = join(__dirname, '..', 'assets');

const appIcon = readFileSync(join(SRC, 'icon-light.svg'));
const foreground = readFileSync(join(SRC, 'icon-foreground.svg'));

async function render(svg: Buffer, size: number, out: string) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(ASSETS, out));
  console.log(`✓ ${out} (${size}px)`);
}

await render(appIcon, 1024, 'icon.png');          // iOS light slot + top-level
await render(appIcon, 1024, 'icon-dark.png');     // iOS dark slot (kept light per preference)
await render(appIcon, 196, 'favicon.png');        // web favicon
await render(foreground, 1024, 'adaptive-icon.png'); // Android adaptive foreground (over #0A0A0A)
await render(foreground, 1024, 'splash-icon.png');   // splash (contain, over #0A0A0A)
await render(foreground, 320, 'logo.png');           // README mark (transparent, adapts to GitHub theme)
console.log('done.');
