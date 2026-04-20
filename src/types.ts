export type CardId = string;

export type BarcodeFormat =
  | 'QR'
  | 'EAN13'
  | 'EAN8'
  | 'CODE128'
  | 'CODE39'
  | 'UPCA'
  | 'UPCE'
  | 'PDF417'
  | 'AZTEC'
  | 'DATAMATRIX'
  | 'ITF14';

export type SortMode = 'manual' | 'alphabetical' | 'dateCreated';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface FidelityCard {
  id: CardId;
  name: string;
  code: string;
  format: BarcodeFormat;
  color?: string;
  logoSlug?: string;
  customLogoUri?: string;
  notes?: string;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type LanguagePreference = 'system' | 'en' | 'it' | 'fr' | 'es';

export interface Settings {
  themeMode: ThemeMode;
  sortMode: SortMode;
  language: LanguagePreference;
}

/** Shape of each entry in data/brand-index.json. */
export interface BrandEntry {
  slug: string;
  name: string;
  aliases: string[];
  alt: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
}

/** A selectable barcode format option shown in format pickers. */
export interface BarcodeFormatOption {
  value: BarcodeFormat;
  label: string;
}
