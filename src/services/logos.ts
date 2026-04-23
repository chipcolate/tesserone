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
  'esselunga.png': require('../../assets/logos/esselunga.png'),
  'conad.png': require('../../assets/logos/conad.png'),
  'decathlon.png': require('../../assets/logos/decathlon.png'),
  'ikea.png': require('../../assets/logos/ikea.png'),
  'iperal.png': require('../../assets/logos/iperal.png'),
  'lapiadineria.png': require('../../assets/logos/lapiadineria.png'),
  'media-world.png': require('../../assets/logos/media-world.png'),
  'ovs.png': require('../../assets/logos/ovs.png'),
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

function customLogoDir(): Directory {
  return new Directory(Paths.document, CUSTOM_LOGO_DIR_NAME);
}

function customLogoDirPrefix(): string {
  const uri = customLogoDir().uri;
  return uri.endsWith('/') ? uri : uri + '/';
}

function ensureCustomLogoDir(): Directory {
  const dir = customLogoDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function newCustomLogoFilename(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

/** True if `uri` points at a file inside the app's custom-logos directory. */
export function isCustomLogoUri(uri: string | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith(customLogoDirPrefix());
}

export type PickCustomLogoResult =
  | { kind: 'picked'; uri: string }
  | { kind: 'canceled' }
  | { kind: 'permissionDenied' }
  | { kind: 'error'; message: string };

/**
 * Prompts the user for photo library access, opens the picker with a square
 * crop, and copies the selected image into the custom-logos directory.
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
    const dest = new File(dir, newCustomLogoFilename());
    dest.create({ overwrite: true });
    dest.write(asset.base64, { encoding: 'base64' });
    return { kind: 'picked', uri: dest.uri };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Writes a base64 data URI into the custom-logos dir and returns the new
 * file URI. Returns null if the data URI is malformed or the write fails.
 * Used by import to rehydrate custom logos from exported JSON.
 */
export function writeCustomLogoFromDataUri(dataUri: string): string | null {
  const match = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.*)$/.exec(dataUri);
  if (!match) return null;
  try {
    const dir = ensureCustomLogoDir();
    const file = new File(dir, newCustomLogoFilename());
    file.create({ overwrite: true });
    file.write(match[1], { encoding: 'base64' });
    return file.uri;
  } catch {
    return null;
  }
}

/**
 * Reads a custom-logo file and returns a JPEG base64 data URI. Returns null
 * if the URI isn't in our dir or the file is missing. Used by export.
 */
export async function customLogoToDataUri(uri: string): Promise<string | null> {
  if (!isCustomLogoUri(uri)) return null;
  try {
    const file = new File(uri);
    if (!file.exists) return null;
    const base64 = await file.base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

/** Best-effort delete of a custom-logo file. No-op for non-custom URIs. */
export function deleteCustomLogo(uri: string | undefined): void {
  if (!isCustomLogoUri(uri)) return;
  try {
    const file = new File(uri!);
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
    if (isCustomLogoUri(card.customLogoUri)) referenced.add(card.customLogoUri!);
  }
  try {
    for (const entry of dir.list()) {
      if (entry instanceof File && !referenced.has(entry.uri)) {
        try { entry.delete(); } catch { /* ignore */ }
      }
    }
  } catch {
    // ignore enumeration errors
  }
}
