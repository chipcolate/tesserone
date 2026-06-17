#!/usr/bin/env node
/**
 * Emits SQL to seed the demo wallet into the Android AsyncStorage DB
 * (legacy backend: db file "RKStorage", table "catalystLocalStorage", key/value).
 *
 *   node scripts/android-seed-sql.mjs <theme> <locale> | sqlite3 RKStorage.db
 */
import { buildPersistedState } from './seed-demo-data.mjs';

const [, , theme = 'light', locale = 'en'] = process.argv;
const s = buildPersistedState(theme, locale);

const esc = (v) => v.replace(/'/g, "''"); // SQL single-quote escaping
const rows = [
  ['cards', s.cards],
  ['settings', s.settings],
  ['tutorial', s.tutorial],
];

console.log('BEGIN;');
console.log('DELETE FROM catalystLocalStorage;');
for (const [k, v] of rows) {
  console.log(`INSERT OR REPLACE INTO catalystLocalStorage(key, value) VALUES('${esc(k)}', '${esc(v)}');`);
}
console.log('COMMIT;');
