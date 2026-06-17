#!/usr/bin/env node
/**
 * Injects the demo wallet state directly into an installed app's AsyncStorage
 * so screenshot capture is deterministic. App must be terminated first.
 *
 * iOS:
 *   node scripts/inject-screenshot-state.mjs --ios <containerDataPath> <theme> <locale>
 *     containerDataPath = `xcrun simctl get_app_container booted <bundle> data`
 *
 * The RN community AsyncStorage (iOS) uses RCTAsyncLocalStorage_V1/manifest.json
 * mapping key -> stringified value, with values > 1024 chars offloaded to a side
 * file named md5(key) and stored as null in the manifest.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildPersistedState } from './seed-demo-data.mjs';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const INLINE_THRESHOLD = 1024; // RCTInlineValueThreshold

const args = process.argv.slice(2);
const platform = args[0];

if (platform !== '--ios') {
  console.error('Only --ios is supported by this injector.');
  process.exit(1);
}

const [, container, theme = 'light', locale = 'en', bundle = 'com.chipcolate.tesserone'] = args;
if (!container) {
  console.error('Missing container data path.');
  process.exit(1);
}

const storageDir = join(container, 'Library', 'Application Support', bundle, 'RCTAsyncLocalStorage_V1');
mkdirSync(storageDir, { recursive: true });

const state = buildPersistedState(theme, locale);

// Preserve any keys already present (e.g. watch-known-logos) that we don't manage.
const manifestPath = join(storageDir, 'manifest.json');
let manifest = {};
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    manifest = {};
  }
}

for (const [key, value] of Object.entries(state)) {
  if (value.length > INLINE_THRESHOLD) {
    writeFileSync(join(storageDir, md5(key)), value);
    manifest[key] = null;
  } else {
    manifest[key] = value;
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest));
console.log(`Seeded ${Object.keys(state).join(', ')} | theme=${theme} locale=${locale}`);
console.log(`-> ${storageDir}`);
