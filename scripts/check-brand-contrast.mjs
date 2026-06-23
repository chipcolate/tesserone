#!/usr/bin/env node
/**
 * Guards brand presets against unreadable cards. For every brand in
 * data/brand-index.json it measures how much of the logo's opaque area is
 * clearly distinguishable from the card background (its `primaryColor`), since
 * CardFace renders the logo directly on that color with no backing tile.
 *
 * Fails (exit 1) if any brand falls below MIN_VISIBLE — the case that produced
 * black-on-black Sephora and red-on-red Tesco cards. Also prints a "could be
 * better" advisory when a brand's own secondaryColor (or white/black) would
 * show noticeably more of the logo, without failing the build.
 *
 * Run: bun run check:logos   (or: node scripts/check-brand-contrast.mjs)
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brands = JSON.parse(readFileSync(path.join(ROOT, 'data/brand-index.json'), 'utf8'));

// Fraction of opaque logo pixels that must clearly contrast the background.
const MIN_VISIBLE = 0.6;
// A pixel "reads" against the background at this WCAG contrast ratio or higher.
const PIXEL_CONTRAST = 2.0;
// Advise switching backgrounds when an alternative shows this much more.
const IMPROVE_DELTA = 0.15;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function srgbToLin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function lum([r, g, b]) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function opaquePixels(file) {
  const { data, info } = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const px = [];
  for (let i = 0; i < data.length; i += ch * 4 /* sample */) {
    if (data[i + 3] >= 128) px.push([data[i], data[i + 1], data[i + 2]]);
  }
  return px;
}
function visibleFrac(px, hex) {
  const bg = hexToRgb(hex);
  let n = 0;
  for (const p of px) if (contrast(p, bg) >= PIXEL_CONTRAST) n++;
  return px.length ? n / px.length : 0;
}

const failures = [];
const advisories = [];

for (const b of brands) {
  const px = await opaquePixels(path.join(ROOT, 'assets/logos', b.logo));
  if (px.length === 0) {
    failures.push(`${b.slug}: logo has no opaque pixels`);
    continue;
  }
  const vPrimary = visibleFrac(px, b.primaryColor);
  if (vPrimary < MIN_VISIBLE) {
    failures.push(`${b.slug}: only ${(vPrimary * 100).toFixed(0)}% of the logo reads on ${b.primaryColor}`);
  }
  const best = Math.max(
    visibleFrac(px, b.secondaryColor),
    visibleFrac(px, '#FFFFFF'),
    visibleFrac(px, '#000000')
  );
  if (best - vPrimary > IMPROVE_DELTA && vPrimary >= MIN_VISIBLE) {
    advisories.push(`${b.slug}: ${(vPrimary * 100).toFixed(0)}% on ${b.primaryColor}, ${(best * 100).toFixed(0)}% achievable`);
  }
}

if (advisories.length) {
  console.log('Advisories (not failures):');
  for (const a of advisories) console.log('  ·', a);
  console.log('');
}
if (failures.length) {
  console.error(`✖ ${failures.length} brand preset(s) are hard to read:`);
  for (const f of failures) console.error('  -', f);
  console.error(`\nFix: set primaryColor to the brand's secondaryColor, or #FFFFFF / #000000.`);
  process.exit(1);
}
console.log(`✔ All ${brands.length} brand presets are legible (logo ≥ ${MIN_VISIBLE * 100}% visible on its background).`);
