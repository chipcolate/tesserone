#!/usr/bin/env bun
// Run: TINIFY_API_KEY=xxx bun run tinify-logos
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import tinify from 'tinify';

const LOGOS_DIR = join(process.cwd(), 'assets', 'logos');
const MANIFEST_PATH = join(LOGOS_DIR, '.tinified.json');

// Cap source PNGs at this longest-edge size. Logos render at 160x48 logical
// pixels in CardFace, so even at xxxhdpi (4x density) 640px is plenty.
// Anything larger is wasted decoded-bitmap RAM on Android, which Glide
// allocates at source resolution before downscaling.
const MAX_EDGE = 512;

type ManifestEntry = {
  hash: string;
  originalSize: number;
  tinifiedSize: number;
  width?: number;
  height?: number;
  date: string;
};
type Manifest = Record<string, ManifestEntry>;

// PNG header layout: 8-byte signature, then IHDR chunk whose first 8 data
// bytes are width and height as big-endian uint32. Width sits at offset 16,
// height at offset 20.
const readPngDimensions = (
  buf: Uint8Array
): { width: number; height: number } | null => {
  if (
    buf.length < 24 ||
    buf[0] !== 0x89 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x4e ||
    buf[3] !== 0x47
  ) {
    return null;
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: dv.getUint32(16, false), height: dv.getUint32(20, false) };
};

const apiKey = process.env.TINIFY_API_KEY;
if (!apiKey) {
  console.error('TINIFY_API_KEY env var is required');
  process.exit(1);
}
tinify.key = apiKey;

const sha256 = (buf: Uint8Array) => createHash('sha256').update(buf).digest('hex');
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

const loadManifest = async (): Promise<Manifest> => {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
};

const saveManifest = async (m: Manifest) => {
  const sorted: Manifest = {};
  for (const k of Object.keys(m).sort()) sorted[k] = m[k];
  await writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
};

const main = async () => {
  const manifest = await loadManifest();
  const files = (await readdir(LOGOS_DIR))
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();

  let processed = 0,
    skipped = 0,
    failed = 0,
    totalBefore = 0,
    totalAfter = 0;

  for (const file of files) {
    const path = join(LOGOS_DIR, file);
    const before = await readFile(path);
    const beforeHash = sha256(before);
    const beforeSize = before.byteLength;
    totalBefore += beforeSize;

    const beforeDims = readPngDimensions(before);
    const oversized =
      beforeDims !== null &&
      Math.max(beforeDims.width, beforeDims.height) > MAX_EDGE;

    const entry = manifest[file];
    // Cache is only trustworthy when we've recorded dimensions and they're
    // already within the cap. Entries from older runs lack width/height, so
    // they'll be reprocessed once to capture them (and to shrink if needed).
    const cachedDimsOk =
      entry?.width !== undefined &&
      entry?.height !== undefined &&
      Math.max(entry.width, entry.height) <= MAX_EDGE;
    if (entry && entry.hash === beforeHash && cachedDimsOk) {
      skipped++;
      totalAfter += beforeSize;
      continue;
    }

    try {
      const dimsLabel = beforeDims
        ? `${beforeDims.width}x${beforeDims.height}`
        : '?';
      const resizeLabel = oversized ? ` resize->${MAX_EDGE}px` : '';
      process.stdout.write(
        `tinifying ${file} (${dimsLabel}, ${kb(beforeSize)})${resizeLabel}... `
      );

      const source = tinify.fromBuffer(before);
      const pipeline = oversized
        ? source.resize({ method: 'fit', width: MAX_EDGE, height: MAX_EDGE })
        : source;
      const tinified = Buffer.from(await pipeline.toBuffer());
      const afterSize = tinified.byteLength;
      const afterDims = readPngDimensions(tinified) ?? beforeDims;

      // When we asked tinify to resize, always accept the result even if it
      // ends up slightly larger in bytes — the win is the pixel count, not
      // the file size.
      if (afterSize < beforeSize || oversized) {
        await writeFile(path, tinified);
        manifest[file] = {
          hash: sha256(tinified),
          originalSize: beforeSize,
          tinifiedSize: afterSize,
          width: afterDims?.width,
          height: afterDims?.height,
          date: new Date().toISOString(),
        };
        totalAfter += afterSize;
        const pct = ((1 - afterSize / beforeSize) * 100).toFixed(1);
        const afterLabel = afterDims
          ? `${afterDims.width}x${afterDims.height}, `
          : '';
        console.log(`-> ${afterLabel}${kb(afterSize)} (-${pct}%)`);
      } else {
        manifest[file] = {
          hash: beforeHash,
          originalSize: beforeSize,
          tinifiedSize: beforeSize,
          width: beforeDims?.width,
          height: beforeDims?.height,
          date: new Date().toISOString(),
        };
        totalAfter += beforeSize;
        console.log('no improvement, kept original');
      }
      processed++;
      await saveManifest(manifest);
    } catch (err) {
      failed++;
      totalAfter += beforeSize;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL: ${msg}`);
    }
  }

  await saveManifest(manifest);

  const savedBytes = totalBefore - totalAfter;
  const savedPct = totalBefore > 0 ? ((savedBytes / totalBefore) * 100).toFixed(1) : '0';
  console.log('');
  console.log(`processed: ${processed}, skipped: ${skipped}, failed: ${failed}`);
  console.log(`total: ${mb(totalBefore)} -> ${mb(totalAfter)} (-${savedPct}%)`);
  console.log(`compressions used this month: ${tinify.compressionCount ?? 'unknown'}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
