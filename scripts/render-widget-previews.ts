/**
 * Renders Android home-screen widget preview images (shown in the widget picker)
 * for the single-card and card-list widgets. Pure inline SVG → PNG via sharp; no
 * external assets or brand logos. Run: bun run scripts/render-widget-previews.ts
 */
import sharp from 'sharp';
import { join } from 'node:path';

const ASSETS = join(__dirname, '..', 'assets');

// A few card colors from theme/colors.ts for variety.
const COLORS = ['#6C2DD7', '#EF5350', '#42A5F5', '#66BB6A', '#FFA726', '#EC407A', '#26C6DA', '#AB47BC'];

// Deterministic-but-varied bar widths so previews look like a barcode.
function bars(x: number, y: number, w: number, h: number, seed: number): string {
  const widths = [3, 6, 2, 5, 3, 2, 7, 3, 4, 2, 6, 3, 2, 5, 3, 4, 2, 6, 3, 2];
  let cx = x;
  let out = '';
  let i = seed;
  while (cx < x + w) {
    const bw = widths[i % widths.length];
    if (i % 2 === 0) out += `<rect x="${cx}" y="${y}" width="${bw}" height="${h}" fill="#FFFFFF"/>`;
    cx += bw + 1;
    i++;
  }
  return out;
}

function tile(x: number, y: number, size: number, color: string, seed: number): string {
  const pad = Math.round(size * 0.22);
  return (
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size * 0.06)}" fill="${color}"/>` +
    bars(x + pad, y + Math.round(size * 0.38), size - pad * 2, Math.round(size * 0.24), seed)
  );
}

function singleSvg(): string {
  const S = 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${tile(10, 10, 280, COLORS[0], 0)}</svg>`;
}

function listSvg(): string {
  const W = 600;
  const H = 300;
  const cols = 4;
  const rows = 2;
  const gap = 16;
  const pad = 16;
  const cell = Math.round((W - pad * 2 - gap * (cols - 1)) / cols);
  let tiles = '';
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cell + gap);
      const y = pad + r * (cell + gap);
      tiles += tile(x, y, cell, COLORS[n % COLORS.length], n);
      n++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="16" fill="#0A0A0A"/>${tiles}</svg>`;
}

async function render(svg: string, out: string) {
  await sharp(Buffer.from(svg)).png().toFile(join(ASSETS, out));
  console.log(`✓ ${out}`);
}

await render(singleSvg(), 'widget-single-preview.png');
await render(listSvg(), 'widget-list-preview.png');
console.log('done.');
