import { ImageSourcePropType } from 'react-native';
import Fuse from 'fuse.js';
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
