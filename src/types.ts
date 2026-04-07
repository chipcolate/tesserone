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

export interface Settings {
  themeMode: ThemeMode;
  sortMode: SortMode;
}
