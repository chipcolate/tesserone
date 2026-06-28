/**
 * Localizes the Android home-screen widget picker strings.
 *
 * react-native-android-widget writes `android:label` verbatim (so an
 * `@string/...` reference resolves) and turns each widget `description` into a
 * `@string/widget_<name>_description` resource. This plugin supplies:
 *   - the English (default) label strings referenced by app.json
 *   - localized (it/fr/es/de) overrides for both the labels and descriptions
 *
 * Keep the keys in sync with the widget `name`s in app.json (lowercased).
 */
const { withStringsXml, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LOCALES = ['it', 'fr', 'es', 'de'];

// name -> { en, it, fr, es, de }
const STRINGS = {
  widget_singlecard_label: {
    en: 'Tesserone Card',
    it: 'Tessera Tesserone',
    fr: 'Carte Tesserone',
    es: 'Tarjeta Tesserone',
    de: 'Tesserone-Karte',
  },
  widget_cardlist_label: {
    en: 'Tesserone Cards',
    it: 'Tessere Tesserone',
    fr: 'Cartes Tesserone',
    es: 'Tarjetas Tesserone',
    de: 'Tesserone-Karten',
  },
  // Descriptions: en default comes from app.json (via the widget plugin); only
  // the locale overrides are written here.
  widget_singlecard_description: {
    it: 'Apri una tessera fedeltà direttamente dalla schermata Home.',
    fr: 'Ouvre une carte de fidélité directement depuis l’écran d’accueil.',
    es: 'Abre una tarjeta de fidelidad directamente desde la pantalla de inicio.',
    de: 'Öffne eine Kundenkarte direkt vom Homescreen.',
  },
  widget_cardlist_description: {
    it: 'Mostra un gruppo di tessere; toccane una per aprirla.',
    fr: 'Affiche un ensemble de cartes ; touche-en une pour l’ouvrir.',
    es: 'Muestra un conjunto de tarjetas; toca una para abrirla.',
    de: 'Zeigt mehrere Karten; tippe eine an, um sie zu öffnen.',
  },
};

const LABEL_KEYS = ['widget_singlecard_label', 'widget_cardlist_label'];
const ALL_KEYS = Object.keys(STRINGS);

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, "\\'");
}

/** Write/merge our keys into res/values-<lang>/strings.xml without clobbering others. */
function writeLocaleStrings(resDir, lang) {
  const dir = path.join(resDir, `values-${lang}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'strings.xml');

  const entries = ALL_KEYS.filter((k) => STRINGS[k][lang]).map(
    (k) => `    <string name="${k}" translatable="false">${esc(STRINGS[k][lang])}</string>`
  );

  let body;
  if (fs.existsSync(file)) {
    let xml = fs.readFileSync(file, 'utf8');
    // Drop any prior copies of our keys so re-runs stay idempotent.
    for (const k of ALL_KEYS) {
      xml = xml.replace(new RegExp(`\\s*<string name="${k}"[^>]*>.*?</string>`, 'gs'), '');
    }
    body = xml.replace(/<\/resources>\s*$/, `${entries.join('\n')}\n</resources>\n`);
  } else {
    body = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${entries.join('\n')}\n</resources>\n`;
  }
  fs.writeFileSync(file, body);
}

module.exports = function withWidgetStrings(config) {
  // English (default) label strings referenced by app.json's `@string/...` labels.
  config = withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      LABEL_KEYS.map((k) => ({
        $: { name: k, translatable: 'false' },
        _: STRINGS[k].en,
      })),
      cfg.modResults
    );
    return cfg;
  });

  // Localized overrides for labels + descriptions.
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const resDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      for (const lang of LOCALES) writeLocaleStrings(resDir, lang);
      return cfg;
    },
  ]);

  return config;
};
