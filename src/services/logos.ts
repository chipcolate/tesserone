import { ImageSourcePropType } from 'react-native';
import Fuse from 'fuse.js';
import brandIndexData from '../../data/brand-index.json';
import type { BrandEntry } from '../types';

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
