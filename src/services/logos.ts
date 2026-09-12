import { ImageSourcePropType } from 'react-native';
import Fuse from 'fuse.js';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import brandIndexData from '../../shared/brands/brand-index.json';
import { FALLBACK_CARD_BG } from '../theme/colors';
import type { BrandEntry, FidelityCard } from '../types';

export type { BrandEntry } from '../types';

// Cast the bundled JSON once to our domain type. TS infers a very narrow
// literal type from the JSON file; this assertion widens strings where
// needed and aligns the shape with BrandEntry.
const brandIndex: BrandEntry[] = brandIndexData as BrandEntry[];

const BUNDLED_LOGOS: Record<string, ImageSourcePropType> = {
  'acqua-e-sapone.png': require('../../shared/brands/logos/acqua-e-sapone.png'),
  'alcampo.png': require('../../shared/brands/logos/alcampo.png'),
  'aldi.png': require('../../shared/brands/logos/aldi.png'),
  'argos.png': require('../../shared/brands/logos/argos.png'),
  'asda.png': require('../../shared/brands/logos/asda.png'),
  'auchan.png': require('../../shared/brands/logos/auchan.png'),
  'bennet.png': require('../../shared/brands/logos/bennet.png'),
  'bershka.png': require('../../shared/brands/logos/bershka.png'),
  'bonpreu.png': require('../../shared/brands/logos/bonpreu.png'),
  'boulanger.png': require('../../shared/brands/logos/boulanger.png'),
  'budni.png': require('../../shared/brands/logos/budni.png'),
  'caprabo.png': require('../../shared/brands/logos/caprabo.png'),
  'carrefour.png': require('../../shared/brands/logos/carrefour.png'),
  'castorama.png': require('../../shared/brands/logos/castorama.png'),
  'celio.png': require('../../shared/brands/logos/celio.png'),
  'conad.png': require('../../shared/brands/logos/conad.png'),
  'consum.png': require('../../shared/brands/logos/consum.png'),
  'cortefiel.png': require('../../shared/brands/logos/cortefiel.png'),
  'costa-coffee.png': require('../../shared/brands/logos/costa-coffee.png'),
  'cultura.png': require('../../shared/brands/logos/cultura.png'),
  'darty.png': require('../../shared/brands/logos/darty.png'),
  'decathlon.png': require('../../shared/brands/logos/decathlon.png'),
  'deichmann.png': require('../../shared/brands/logos/deichmann.png'),
  'dia.png': require('../../shared/brands/logos/dia.png'),
  'dm.png': require('../../shared/brands/logos/dm.png'),
  'edeka.png': require('../../shared/brands/logos/edeka.png'),
  'el-corte-ingles.png': require('../../shared/brands/logos/el-corte-ingles.png'),
  'eroski.png': require('../../shared/brands/logos/eroski.png'),
  'esselunga.png': require('../../shared/brands/logos/esselunga.png'),
  'euronics.png': require('../../shared/brands/logos/euronics.png'),
  'eurospin.png': require('../../shared/brands/logos/eurospin.png'),
  'feltrinelli.png': require('../../shared/brands/logos/feltrinelli.png'),
  'fnac.png': require('../../shared/brands/logos/fnac.png'),
  'franprix.png': require('../../shared/brands/logos/franprix.png'),
  'geant-casino.png': require('../../shared/brands/logos/geant-casino.png'),
  'globus.png': require('../../shared/brands/logos/globus.png'),
  'grand-frais.png': require('../../shared/brands/logos/grand-frais.png'),
  'halfords.png': require('../../shared/brands/logos/halfords.png'),
  'hipercor.png': require('../../shared/brands/logos/hipercor.png'),
  'hornbach.png': require('../../shared/brands/logos/hornbach.png'),
  'iceland-foods.png': require('../../shared/brands/logos/iceland-foods.png'),
  'ikea.png': require('../../shared/brands/logos/ikea.png'),
  'intermarche.png': require('../../shared/brands/logos/intermarche.png'),
  'iperal.png': require('../../shared/brands/logos/iperal.png'),
  'john-lewis.png': require('../../shared/brands/logos/john-lewis.png'),
  'kaufland.png': require('../../shared/brands/logos/kaufland.png'),
  'kiabi.png': require('../../shared/brands/logos/kiabi.png'),
  'kik.png': require('../../shared/brands/logos/kik.png'),
  'lapiadineria.png': require('../../shared/brands/logos/lapiadineria.png'),
  'leclerc.png': require('../../shared/brands/logos/leclerc.png'),
  'leroy-merlin.png': require('../../shared/brands/logos/leroy-merlin.png'),
  'lidl.png': require('../../shared/brands/logos/lidl.png'),
  'mango.png': require('../../shared/brands/logos/mango.png'),
  'marks-and-spencer.png': require('../../shared/brands/logos/marks-and-spencer.png'),
  'media-world.png': require('../../shared/brands/logos/media-world.png'),
  'mediamarkt.png': require('../../shared/brands/logos/mediamarkt.png'),
  'mercadona.png': require('../../shared/brands/logos/mercadona.png'),
  'mondadori.png': require('../../shared/brands/logos/mondadori.png'),
  'monoprix.png': require('../../shared/brands/logos/monoprix.png'),
  'morrisons.png': require('../../shared/brands/logos/morrisons.png'),
  'netto.png': require('../../shared/brands/logos/netto.png'),
  'nocibe.png': require('../../shared/brands/logos/nocibe.png'),
  'obi.png': require('../../shared/brands/logos/obi.png'),
  'ovs.png': require('../../shared/brands/logos/ovs.png'),
  'pam.png': require('../../shared/brands/logos/pam.png'),
  'penny.png': require('../../shared/brands/logos/penny.png'),
  'pret-a-manger.png': require('../../shared/brands/logos/pret-a-manger.png'),
  'rewe.png': require('../../shared/brands/logos/rewe.png'),
  'rossmann.png': require('../../shared/brands/logos/rossmann.png'),
  'sainsburys.png': require('../../shared/brands/logos/sainsburys.png'),
  'saturn.png': require('../../shared/brands/logos/saturn.png'),
  'sephora.png': require('../../shared/brands/logos/sephora.png'),
  'superdrug.png': require('../../shared/brands/logos/superdrug.png'),
  'tchibo.png': require('../../shared/brands/logos/tchibo.png'),
  'tesco.png': require('../../shared/brands/logos/tesco.png'),
  'unieuro.png': require('../../shared/brands/logos/unieuro.png'),
  'waitrose.png': require('../../shared/brands/logos/waitrose.png'),
  'whsmith.png': require('../../shared/brands/logos/whsmith.png'),
  'yves-rocher.png': require('../../shared/brands/logos/yves-rocher.png'),
  'zara.png': require('../../shared/brands/logos/zara.png'),
  'burger-king.png': require('../../shared/brands/logos/burger-king.png'),
  'h-and-m.png': require('../../shared/brands/logos/h-and-m.png'),
  'kfc.png': require('../../shared/brands/logos/kfc.png'),
  'mcdonalds.png': require('../../shared/brands/logos/mcdonalds.png'),
  'adidas.png': require('../../shared/brands/logos/adidas.png'),
  'foot-locker.png': require('../../shared/brands/logos/foot-locker.png'),
  'nike.png': require('../../shared/brands/logos/nike.png'),
  'starbucks.png': require('../../shared/brands/logos/starbucks.png'),
  'subway.png': require('../../shared/brands/logos/subway.png'),
  'dominos.png': require('../../shared/brands/logos/dominos.png'),
  'intersport.png': require('../../shared/brands/logos/intersport.png'),
  'pizza-hut.png': require('../../shared/brands/logos/pizza-hut.png'),
  'zooplus.png': require('../../shared/brands/logos/zooplus.png'),
  'conforama.png': require('../../shared/brands/logos/conforama.png'),
  'douglas.png': require('../../shared/brands/logos/douglas.png'),
  'five-guys.png': require('../../shared/brands/logos/five-guys.png'),
  'jd-sports.png': require('../../shared/brands/logos/jd-sports.png'),
  'marionnaud.png': require('../../shared/brands/logos/marionnaud.png'),
  'rituals.png': require('../../shared/brands/logos/rituals.png'),
  'samsung.png': require('../../shared/brands/logos/samsung.png'),
  'spar.png': require('../../shared/brands/logos/spar.png'),
  'the-body-shop.png': require('../../shared/brands/logos/the-body-shop.png'),
  'tim-hortons.png': require('../../shared/brands/logos/tim-hortons.png'),
  'apple.png': require('../../shared/brands/logos/apple.png'),
  'bauhaus.png': require('../../shared/brands/logos/bauhaus.png'),
  'c-and-a.png': require('../../shared/brands/logos/c-and-a.png'),
  'calzedonia.png': require('../../shared/brands/logos/calzedonia.png'),
  'chicco.png': require('../../shared/brands/logos/chicco.png'),
  'co-op.png': require('../../shared/brands/logos/co-op.png'),
  'dunkin.png': require('../../shared/brands/logos/dunkin.png'),
  'expert.png': require('../../shared/brands/logos/expert.png'),
  'famila.png': require('../../shared/brands/logos/famila.png'),
  'game.png': require('../../shared/brands/logos/game.png'),
  'gamestop.png': require('../../shared/brands/logos/gamestop.png'),
  'gap.png': require('../../shared/brands/logos/gap.png'),
  'intimissimi.png': require('../../shared/brands/logos/intimissimi.png'),
  'kiko-milano.png': require('../../shared/brands/logos/kiko-milano.png'),
  'krispy-kreme.png': require('../../shared/brands/logos/krispy-kreme.png'),
  'loccitane.png': require('../../shared/brands/logos/loccitane.png'),
  'lego-store.png': require('../../shared/brands/logos/lego-store.png'),
  'maisons-du-monde.png': require('../../shared/brands/logos/maisons-du-monde.png'),
  'popeyes.png': require('../../shared/brands/logos/popeyes.png'),
  'prenatal.png': require('../../shared/brands/logos/prenatal.png'),
  'sport-2000.png': require('../../shared/brands/logos/sport-2000.png'),
  'taco-bell.png': require('../../shared/brands/logos/taco-bell.png'),
  'tezenis.png': require('../../shared/brands/logos/tezenis.png'),
  'tgi-fridays.png': require('../../shared/brands/logos/tgi-fridays.png'),
  'the-north-face.png': require('../../shared/brands/logos/the-north-face.png'),
  'wagamama.png': require('../../shared/brands/logos/wagamama.png'),
  'smyths-toys.png': require('../../shared/brands/logos/smyths-toys.png'),
  'alcott.png': require('../../shared/brands/logos/alcott.png'),
  'bricocenter.png': require('../../shared/brands/logos/bricocenter.png'),
  'bricofer.png': require('../../shared/brands/logos/bricofer.png'),
  'chef-express.png': require('../../shared/brands/logos/chef-express.png'),
  'despar.png': require('../../shared/brands/logos/despar.png'),
  'dr-max.png': require('../../shared/brands/logos/dr-max.png'),
  'eataly.png': require('../../shared/brands/logos/eataly.png'),
  'eurobrico.png': require('../../shared/brands/logos/eurobrico.png'),
  'fao-schwarz.png': require('../../shared/brands/logos/fao-schwarz.png'),
  'flying-tiger-copenhagen.png': require('../../shared/brands/logos/flying-tiger-copenhagen.png'),
  'geox.png': require('../../shared/brands/logos/geox.png'),
  'guess.png': require('../../shared/brands/logos/guess.png'),
  'libraccio.png': require('../../shared/brands/logos/libraccio.png'),
  'libreriecoop.png': require('../../shared/brands/logos/libreriecoop.png'),
  'liu-jo.png': require('../../shared/brands/logos/liu-jo.png'),
  'piazza-italia.png': require('../../shared/brands/logos/piazza-italia.png'),
  'pittarello.png': require('../../shared/brands/logos/pittarello.png'),
  'rossopomodoro.png': require('../../shared/brands/logos/rossopomodoro.png'),
  'sportler.png': require('../../shared/brands/logos/sportler.png'),
  'todis.png': require('../../shared/brands/logos/todis.png'),
  'tommy-hilfiger.png': require('../../shared/brands/logos/tommy-hilfiger.png'),
  'united-colors-of-benetton.png': require('../../shared/brands/logos/united-colors-of-benetton.png'),
  'venchi.png': require('../../shared/brands/logos/venchi.png'),
  'xiaomi.png': require('../../shared/brands/logos/xiaomi.png'),
  'yamamay.png': require('../../shared/brands/logos/yamamay.png'),
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

const bundledLogoUriCache = new Map<string, string>();

/**
 * Resolve a bundled brand logo (require() handle) to an on-disk file URI.
 * Used by the watch sync layer to feed `transferFile`, which needs a real
 * path. Cached in-process; safe to call repeatedly.
 */
export async function resolveBundledLogoUri(brandSlug: string): Promise<string | undefined> {
  const brand = getBrand(brandSlug);
  if (!brand) return undefined;
  const cached = bundledLogoUriCache.get(brand.logo);
  if (cached) return cached;
  const handle = BUNDLED_LOGOS[brand.logo];
  if (typeof handle !== 'number') return undefined;
  const asset = Asset.fromModule(handle);
  if (!asset.localUri) await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri) bundledLogoUriCache.set(brand.logo, uri);
  return uri ?? undefined;
}

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
  | { kind: 'permissionDenied'; canAskAgain: boolean }
  | { kind: 'error'; message: string };

/**
 * Prompts the user for photo library access, opens the picker with a square
 * crop, and copies the selected image into the custom-logos directory.
 * Returns the bare filename to persist on the card.
 */
export async function pickCustomLogoFromLibrary(): Promise<PickCustomLogoResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { kind: 'permissionDenied', canAskAgain: perm.canAskAgain };
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
