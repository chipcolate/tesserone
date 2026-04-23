import { ImageSourcePropType } from 'react-native';
import Fuse from 'fuse.js';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import brandIndexData from '../../data/brand-index.json';
import type { BrandEntry, FidelityCard } from '../types';

export type { BrandEntry } from '../types';

// Cast the bundled JSON once to our domain type. TS infers a very narrow
// literal type from the JSON file; this assertion widens strings where
// needed and aligns the shape with BrandEntry.
const brandIndex: BrandEntry[] = brandIndexData as BrandEntry[];

const BUNDLED_LOGOS: Record<string, ImageSourcePropType> = {
  'acqua-e-sapone.png': require('../../assets/logos/acqua-e-sapone.png'),
  'alcampo.png': require('../../assets/logos/alcampo.png'),
  'aldi.png': require('../../assets/logos/aldi.png'),
  'argos.png': require('../../assets/logos/argos.png'),
  'asda.png': require('../../assets/logos/asda.png'),
  'auchan.png': require('../../assets/logos/auchan.png'),
  'bennet.png': require('../../assets/logos/bennet.png'),
  'bershka.png': require('../../assets/logos/bershka.png'),
  'bonpreu.png': require('../../assets/logos/bonpreu.png'),
  'boulanger.png': require('../../assets/logos/boulanger.png'),
  'budni.png': require('../../assets/logos/budni.png'),
  'caprabo.png': require('../../assets/logos/caprabo.png'),
  'carrefour.png': require('../../assets/logos/carrefour.png'),
  'castorama.png': require('../../assets/logos/castorama.png'),
  'celio.png': require('../../assets/logos/celio.png'),
  'conad.png': require('../../assets/logos/conad.png'),
  'consum.png': require('../../assets/logos/consum.png'),
  'cortefiel.png': require('../../assets/logos/cortefiel.png'),
  'costa-coffee.png': require('../../assets/logos/costa-coffee.png'),
  'cultura.png': require('../../assets/logos/cultura.png'),
  'darty.png': require('../../assets/logos/darty.png'),
  'decathlon.png': require('../../assets/logos/decathlon.png'),
  'deichmann.png': require('../../assets/logos/deichmann.png'),
  'dia.png': require('../../assets/logos/dia.png'),
  'dm.png': require('../../assets/logos/dm.png'),
  'edeka.png': require('../../assets/logos/edeka.png'),
  'el-corte-ingles.png': require('../../assets/logos/el-corte-ingles.png'),
  'eroski.png': require('../../assets/logos/eroski.png'),
  'esselunga.png': require('../../assets/logos/esselunga.png'),
  'euronics.png': require('../../assets/logos/euronics.png'),
  'eurospin.png': require('../../assets/logos/eurospin.png'),
  'feltrinelli.png': require('../../assets/logos/feltrinelli.png'),
  'fnac.png': require('../../assets/logos/fnac.png'),
  'franprix.png': require('../../assets/logos/franprix.png'),
  'geant-casino.png': require('../../assets/logos/geant-casino.png'),
  'globus.png': require('../../assets/logos/globus.png'),
  'grand-frais.png': require('../../assets/logos/grand-frais.png'),
  'halfords.png': require('../../assets/logos/halfords.png'),
  'hipercor.png': require('../../assets/logos/hipercor.png'),
  'hornbach.png': require('../../assets/logos/hornbach.png'),
  'iceland-foods.png': require('../../assets/logos/iceland-foods.png'),
  'ikea.png': require('../../assets/logos/ikea.png'),
  'intermarche.png': require('../../assets/logos/intermarche.png'),
  'iperal.png': require('../../assets/logos/iperal.png'),
  'john-lewis.png': require('../../assets/logos/john-lewis.png'),
  'kaufland.png': require('../../assets/logos/kaufland.png'),
  'kiabi.png': require('../../assets/logos/kiabi.png'),
  'kik.png': require('../../assets/logos/kik.png'),
  'lapiadineria.png': require('../../assets/logos/lapiadineria.png'),
  'leclerc.png': require('../../assets/logos/leclerc.png'),
  'leroy-merlin.png': require('../../assets/logos/leroy-merlin.png'),
  'lidl.png': require('../../assets/logos/lidl.png'),
  'mango.png': require('../../assets/logos/mango.png'),
  'marks-and-spencer.png': require('../../assets/logos/marks-and-spencer.png'),
  'media-world.png': require('../../assets/logos/media-world.png'),
  'mediamarkt.png': require('../../assets/logos/mediamarkt.png'),
  'mercadona.png': require('../../assets/logos/mercadona.png'),
  'mondadori.png': require('../../assets/logos/mondadori.png'),
  'monoprix.png': require('../../assets/logos/monoprix.png'),
  'morrisons.png': require('../../assets/logos/morrisons.png'),
  'netto.png': require('../../assets/logos/netto.png'),
  'nocibe.png': require('../../assets/logos/nocibe.png'),
  'obi.png': require('../../assets/logos/obi.png'),
  'ovs.png': require('../../assets/logos/ovs.png'),
  'pam.png': require('../../assets/logos/pam.png'),
  'penny.png': require('../../assets/logos/penny.png'),
  'pret-a-manger.png': require('../../assets/logos/pret-a-manger.png'),
  'rewe.png': require('../../assets/logos/rewe.png'),
  'rossmann.png': require('../../assets/logos/rossmann.png'),
  'sainsburys.png': require('../../assets/logos/sainsburys.png'),
  'saturn.png': require('../../assets/logos/saturn.png'),
  'sephora.png': require('../../assets/logos/sephora.png'),
  'superdrug.png': require('../../assets/logos/superdrug.png'),
  'tchibo.png': require('../../assets/logos/tchibo.png'),
  'tesco.png': require('../../assets/logos/tesco.png'),
  'unieuro.png': require('../../assets/logos/unieuro.png'),
  'waitrose.png': require('../../assets/logos/waitrose.png'),
  'whsmith.png': require('../../assets/logos/whsmith.png'),
  'yves-rocher.png': require('../../assets/logos/yves-rocher.png'),
  'zara.png': require('../../assets/logos/zara.png'),
};

const fuse = new Fuse<BrandEntry>(brandIndex, {
  keys: ['name', 'aliases'],
  threshold: 0.3,
  distance: 100,
});

export function searchBrands(query: string): BrandEntry[] {
  if (!query.trim()) return [];
  return fuse.search(query, { limit: 10 }).map((r) => r.item);
}

export function getBrand(slug: string): BrandEntry | undefined {
  return brandIndex.find((b) => b.slug === slug);
}

export function getBrandColors(slug: string): { primary: string; secondary: string } | undefined {
  const brand = getBrand(slug);
  if (!brand) return undefined;
  return { primary: brand.primaryColor, secondary: brand.secondaryColor };
}

export function getBrandLogo(slug: string): ImageSourcePropType | undefined {
  const brand = getBrand(slug);
  if (!brand) return undefined;
  return BUNDLED_LOGOS[brand.logo];
}

const FALLBACK_CARD_BG = '#333333';

/**
 * Resolve the background color for a card:
 * explicit color → brand primary → fallback dark grey.
 */
export function resolveCardColor(
  color: string | undefined,
  logoSlug: string | undefined
): string {
  return color || getBrand(logoSlug || '')?.primaryColor || FALLBACK_CARD_BG;
}

const CUSTOM_LOGO_DIR_NAME = 'custom-logos';

// We store only the bare filename in `card.customLogoUri` (e.g. "1776969…ab.jpg")
// and reconstruct the absolute path at read time. Absolute `file://` URIs are
// not safe to persist: iOS's app data container can be reassigned across
// installs/updates/runs, and URL normalization (e.g. /var ↔ /private/var)
// can silently break `startsWith(dir)` prefix checks.
const LEGACY_URI_FILENAME_RE = /\/custom-logos\/([^/?#]+)$/;

function customLogoDir(): Directory {
  return new Directory(Paths.document, CUSTOM_LOGO_DIR_NAME);
}

function ensureCustomLogoDir(): Directory {
  const dir = customLogoDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function newCustomLogoFilename(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

/**
 * Extract the bare filename from a stored value. Accepts:
 * - A bare filename (returned as-is after validation)
 * - A legacy absolute `file://…/custom-logos/<name>` URI (filename extracted)
 * Returns undefined if the value can't be parsed or looks unsafe.
 */
export function customLogoFilename(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  if (stored.includes('/')) {
    const match = LEGACY_URI_FILENAME_RE.exec(stored);
    return match?.[1];
  }
  // Bare filename — refuse empties and any path separators slipping through.
  if (!stored || stored.includes('..')) return undefined;
  return stored;
}

/**
 * Full on-disk URI for a stored custom-logo reference, or undefined if the
 * reference can't be resolved to a filename. Does not check that the file
 * exists — callers that care should use `file.exists`.
 */
export function resolveCustomLogoUri(stored: string | undefined): string | undefined {
  const filename = customLogoFilename(stored);
  if (!filename) return undefined;
  return new File(customLogoDir(), filename).uri;
}

/** Image `source` for a stored custom-logo reference, or undefined. */
export function customLogoSource(
  stored: string | undefined
): { uri: string } | undefined {
  const uri = resolveCustomLogoUri(stored);
  return uri ? { uri } : undefined;
}

/** True if the stored value is parseable as a custom-logo reference. */
export function isCustomLogoRef(stored: string | undefined): boolean {
  return customLogoFilename(stored) !== undefined;
}

export type PickCustomLogoResult =
  | { kind: 'picked'; ref: string }
  | { kind: 'canceled' }
  | { kind: 'permissionDenied' }
  | { kind: 'error'; message: string };

/**
 * Prompts the user for photo library access, opens the picker with a square
 * crop, and copies the selected image into the custom-logos directory.
 * Returns the bare filename to persist on the card.
 */
export async function pickCustomLogoFromLibrary(): Promise<PickCustomLogoResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { kind: 'permissionDenied' };
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return { kind: 'canceled' };
    const asset = result.assets[0];
    if (!asset?.base64) return { kind: 'error', message: 'No image data returned' };

    const dir = ensureCustomLogoDir();
    const filename = newCustomLogoFilename();
    const dest = new File(dir, filename);
    dest.create({ overwrite: true });
    dest.write(asset.base64, { encoding: 'base64' });
    return { kind: 'picked', ref: filename };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Writes a base64 data URI into the custom-logos dir and returns the bare
 * filename to persist. Returns null if the data URI is malformed or the write
 * fails. Used by import to rehydrate custom logos from exported JSON.
 */
export function writeCustomLogoFromDataUri(dataUri: string): string | null {
  const match = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.*)$/.exec(dataUri);
  if (!match) return null;
  try {
    const dir = ensureCustomLogoDir();
    const filename = newCustomLogoFilename();
    const file = new File(dir, filename);
    file.create({ overwrite: true });
    file.write(match[1], { encoding: 'base64' });
    return filename;
  } catch {
    return null;
  }
}

/**
 * Reads a custom-logo file for a stored reference and returns a JPEG base64
 * data URI. Returns null if the reference is unparseable or the file is
 * missing. Used by export.
 */
export async function customLogoToDataUri(stored: string): Promise<string | null> {
  const filename = customLogoFilename(stored);
  if (!filename) return null;
  try {
    const file = new File(customLogoDir(), filename);
    if (!file.exists) return null;
    const base64 = await file.base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

/** Best-effort delete of a custom-logo file. No-op for unparseable refs. */
export function deleteCustomLogo(stored: string | undefined): void {
  const filename = customLogoFilename(stored);
  if (!filename) return;
  try {
    const file = new File(customLogoDir(), filename);
    if (file.exists) file.delete();
  } catch {
    // cleanup is best-effort
  }
}

/**
 * Enumerate the custom-logos directory and delete any file not referenced by
 * a card. Covers add-then-cancel leaks and stale files from removed cards
 * that slipped past the store-level cleanup.
 */
export function sweepOrphanLogos(cards: Record<string, FidelityCard>): void {
  const dir = customLogoDir();
  if (!dir.exists) return;
  const referenced = new Set<string>();
  for (const card of Object.values(cards)) {
    const filename = customLogoFilename(card.customLogoUri);
    if (filename) referenced.add(filename);
  }
  try {
    for (const entry of dir.list()) {
      if (entry instanceof File) {
        const segs = entry.uri.split('/');
        const name = segs[segs.length - 1];
        if (!referenced.has(name)) {
          try { entry.delete(); } catch { /* ignore */ }
        }
      }
    }
  } catch {
    // ignore enumeration errors
  }
}
