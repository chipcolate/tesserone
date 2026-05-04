#!/usr/bin/env bun
// Run: TINIFY_API_KEY=xxx bun run tinify-logos
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import tinify from 'tinify';

const LOGOS_DIR = join(process.cwd(), 'assets', 'logos');
const MANIFEST_PATH = join(LOGOS_DIR, '.tinified.json');

type ManifestEntry = {
  hash: string;
  originalSize: number;
  tinifiedSize: number;
  date: string;
};
type Manifest = Record<string, ManifestEntry>;

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

    const entry = manifest[file];
    if (entry && entry.hash === beforeHash) {
      skipped++;
      totalAfter += beforeSize;
      continue;
    }

    try {
      process.stdout.write(`tinifying ${file} (${kb(beforeSize)})... `);
      const tinified = Buffer.from(await tinify.fromBuffer(before).toBuffer());
      const afterSize = tinified.byteLength;

      if (afterSize < beforeSize) {
        await writeFile(path, tinified);
        manifest[file] = {
          hash: sha256(tinified),
          originalSize: beforeSize,
          tinifiedSize: afterSize,
          date: new Date().toISOString(),
        };
        totalAfter += afterSize;
        const pct = ((1 - afterSize / beforeSize) * 100).toFixed(1);
        console.log(`-> ${kb(afterSize)} (-${pct}%)`);
      } else {
        manifest[file] = {
          hash: beforeHash,
          originalSize: beforeSize,
          tinifiedSize: beforeSize,
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
