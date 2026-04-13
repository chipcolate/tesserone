import { ImageSourcePropType } from 'react-native';
import Fuse from 'fuse.js';
import { Paths, Directory, File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import brandIndex from '../../data/brand-index.json';

export interface BrandEntry {
  slug: string;
  name: string;
  aliases: string[];
  alt: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
}

// Bundled logo assets — keyed by filename (including extension).
// Add entries here as you add logos to assets/logos/.
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

// Fuse.js for fuzzy search
const fuse = new Fuse<BrandEntry>(brandIndex as BrandEntry[], {
  keys: ['name', 'aliases'],
  threshold: 0.3,
  distance: 100,
});

/**
 * Search the curated brand index by name.
 */
export function searchBrands(query: string): BrandEntry[] {
  if (!query.trim()) return [];
  return fuse.search(query, { limit: 10 }).map((r) => r.item);
}

/**
 * Get a brand entry by slug.
 */
export function getBrand(slug: string): BrandEntry | undefined {
  return (brandIndex as BrandEntry[]).find((b) => b.slug === slug);
}

/**
 * Get the brand's colors.
 */
export function getBrandColors(slug: string): { primary: string; secondary: string } | undefined {
  const brand = getBrand(slug);
  if (!brand) return undefined;
  return { primary: brand.primaryColor, secondary: brand.secondaryColor };
}

/**
 * Get the bundled logo image source for a brand.
 */
export function getBrandLogo(slug: string): ImageSourcePropType | undefined {
  const brand = getBrand(slug);
  if (!brand) return undefined;
  return BUNDLED_LOGOS[brand.logo];
}

// --- Custom logo upload ---

const logosDir = new Directory(Paths.document, 'logos');

function ensureLogosDir() {
  if (!logosDir.exists) {
    logosDir.create();
  }
}

/**
 * Pick an image from the gallery and save it as a custom logo.
 * Returns the local URI, or null if cancelled.
 */
export async function pickCustomLogo(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  ensureLogosDir();
  const sourceUri = result.assets[0].uri;
  const ext = sourceUri.split('.').pop() || 'png';
  const filename = `custom-${Date.now()}.${ext}`;
  const dest = new File(logosDir, filename);
  const source = new File(sourceUri);
  source.move(dest);
  return dest.uri;
}

/**
 * Take a photo and save it as a custom logo.
 * Returns the local URI, or null if cancelled.
 */
export async function takeCustomLogoPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  ensureLogosDir();
  const sourceUri = result.assets[0].uri;
  const ext = sourceUri.split('.').pop() || 'png';
  const filename = `photo-${Date.now()}.${ext}`;
  const dest = new File(logosDir, filename);
  const source = new File(sourceUri);
  source.move(dest);
  return dest.uri;
}

/**
 * Delete a custom logo file.
 */
export function deleteCustomLogo(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
