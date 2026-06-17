#!/usr/bin/env node
/**
 * Builds the AsyncStorage payloads used to seed a demo wallet for App Store /
 * Play Store screenshots, so the capture run is deterministic across locales.
 *
 * Used as a module by scripts/inject-screenshot-state.mjs, and runnable as a
 * CLI for inspection:
 *   node scripts/seed-demo-data.mjs <theme> <locale>   # theme: light|dark
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brands = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'brand-index.json'), 'utf8')
);
const brand = (slug) => brands.find((b) => b.slug === slug);

// EAN-13 check digit from a 12-digit base.
function ean13(base12) {
  const d = base12.split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return base12 + ((10 - (sum % 10)) % 10);
}

const NOW = '2026-06-17T09:30:00.000Z';

// Curated demo wallet: brand-colored cards, a mix of barcode formats, top of
// stack first (sortIndex 0). Card #0 (EAN-13) is the hero for the expanded shot.
const DEFS = [
  { slug: 'conad',       format: 'EAN13',   code: ean13('800462015074') },
  { slug: 'esselunga',   format: 'CODE128', code: 'ES4471 0093 2218' },
  { slug: 'ikea',        format: 'EAN13',   code: ean13('900135724680'),
    notes: 'Family card — 3% back on home' },
  { slug: 'decathlon',   format: 'QR',      code: 'DKTL-8829-4417-0023',
    notes: 'Sport+ member since 2021' },
  { slug: 'media-world', format: 'EAN13',   code: ean13('801120043317') },
  { slug: 'mango',       format: 'CODE128', code: 'MNG 7782 4419 0051' },
];

/** Card id to deep-link for the detail/edit shot (distinctive + has notes). */
export const DETAIL_ID = 'demo-decathlon';

/**
 * Returns the exact strings zustand's persist middleware writes to AsyncStorage
 * under each key (shape: {state, version}).
 */
export function buildPersistedState(theme = 'light', locale = 'en') {
  const themeMode = theme === 'dark' ? 'dark' : 'light';
  const language = ['en', 'it', 'fr', 'es', 'de'].includes(locale) ? locale : 'en';

  const cards = {};
  DEFS.forEach((d, i) => {
    const id = `demo-${d.slug}`;
    cards[id] = {
      id,
      name: brand(d.slug)?.name ?? d.slug,
      code: d.code,
      format: d.format,
      color: brand(d.slug)?.primaryColor ?? '#42A5F5',
      logoSlug: d.slug,
      notes: d.notes,
      sortIndex: i,
      createdAt: NOW,
      updatedAt: NOW,
    };
  });

  return {
    cards: JSON.stringify({ state: { cards }, version: 2 }),
    settings: JSON.stringify({
      state: { themeMode, sortMode: 'manual', language },
      version: 2,
    }),
    // enabled:false suppresses the first-run tutorial overlay during capture.
    tutorial: JSON.stringify({
      state: { enabled: false, seenSteps: {} },
      version: 1,
    }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , theme = 'light', locale = 'en'] = process.argv;
  const s = buildPersistedState(theme, locale);
  process.stdout.write(`CARDS=${s.cards}\n`);
  process.stdout.write(`SETTINGS=${s.settings}\n`);
  process.stdout.write(`TUTORIAL=${s.tutorial}\n`);
  process.stdout.write(`DETAIL_ID=${DETAIL_ID}\n`);
}
