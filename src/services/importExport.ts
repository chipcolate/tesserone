import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FidelityCard, BarcodeFormat, Settings } from '../types';
import {
  customLogoToDataUri,
  writeCustomLogoFromDataUri,
  isCustomLogoUri,
} from './logos';

export interface ExportData {
  cards: FidelityCard[];
  settings: Partial<Settings>;
  exportedAt: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  data?: ExportData;
}

export type MergeStrategy = 'keepExisting' | 'useImported' | 'keepNewer';

const LOWERCASE_FORMAT_MAP: Record<string, BarcodeFormat> = {
  qr: 'QR', ean13: 'EAN13', ean8: 'EAN8', code128: 'CODE128',
  code39: 'CODE39', upcA: 'UPCA', upcE: 'UPCE', pdf417: 'PDF417',
  aztec: 'AZTEC', datamatrix: 'DATAMATRIX', itf: 'ITF14', unknown: 'CODE128',
};

const VALID_FORMATS: readonly BarcodeFormat[] = [
  'QR', 'EAN13', 'EAN8', 'CODE128', 'CODE39',
  'UPCA', 'UPCE', 'PDF417', 'AZTEC', 'DATAMATRIX', 'ITF14',
];

function isBarcodeFormat(value: string): value is BarcodeFormat {
  return (VALID_FORMATS as readonly string[]).includes(value);
}

function normalizeFormat(input: string): BarcodeFormat {
  const mapped = LOWERCASE_FORMAT_MAP[input];
  if (mapped) return mapped;
  return isBarcodeFormat(input) ? input : 'CODE128';
}

/** Loose shape of a card coming in from an untrusted import file. */
type RawImportedCard = {
  id: string;
  name: string;
  code: string;
  format: string;
  color?: string;
  logoSlug?: string;
  customLogoUri?: string;
  notes?: string;
  sortIndex?: number;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeCustomLogoUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  // Exports from 2.1.0+ inline custom logos as data URIs; materialize them.
  if (uri.startsWith('data:')) {
    return writeCustomLogoFromDataUri(uri) ?? undefined;
  }
  // Same-device re-import: if the URI still points into our custom-logos dir
  // and the file is on disk, keep it. Otherwise drop — stale cross-device
  // file:// paths can't be resolved.
  if (isCustomLogoUri(uri)) return uri;
  return undefined;
}

function migrateCard(card: RawImportedCard, index: number): FidelityCard {
  const now = new Date().toISOString();
  return {
    id: card.id,
    name: card.name,
    code: card.code,
    format: normalizeFormat(card.format),
    color: card.color,
    logoSlug: card.logoSlug,
    customLogoUri: normalizeCustomLogoUri(card.customLogoUri),
    notes: card.notes,
    sortIndex: card.sortIndex ?? index,
    createdAt: card.createdAt ?? now,
    updatedAt: card.updatedAt ?? now,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidRawCard(value: unknown): value is RawImportedCard {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.code === 'string' &&
    typeof value.format === 'string'
  );
}

function narrowSettings(value: unknown): Partial<Settings> {
  if (!isObject(value)) return {};
  const out: Partial<Settings> = {};
  if (value.themeMode === 'system' || value.themeMode === 'light' || value.themeMode === 'dark') {
    out.themeMode = value.themeMode;
  }
  if (
    value.sortMode === 'manual' ||
    value.sortMode === 'alphabetical' ||
    value.sortMode === 'dateCreated'
  ) {
    out.sortMode = value.sortMode;
  }
  return out;
}

function validateImportData(data: unknown): ImportResult {
  if (!isObject(data)) {
    return { success: false, error: 'Invalid file format' };
  }
  const rawCards: unknown = data.cards;
  if (!Array.isArray(rawCards)) {
    return { success: false, error: 'Missing or invalid cards array' };
  }
  if (!rawCards.every(isValidRawCard)) {
    return { success: false, error: 'Invalid card data — missing required fields' };
  }
  const migrated: FidelityCard[] = rawCards.map(migrateCard);
  const settings = narrowSettings(data.settings);
  const version = typeof data.version === 'string' ? data.version : '1.0.0';
  const exportedAt =
    typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString();
  return {
    success: true,
    data: { cards: migrated, settings, exportedAt, version },
  };
}

export function detectConflicts(
  existing: Record<string, FidelityCard>,
  imported: FidelityCard[]
): number {
  return imported.filter((c) => existing[c.id]).length;
}

export function mergeCards(
  existing: Record<string, FidelityCard>,
  imported: FidelityCard[],
  strategy: MergeStrategy = 'keepNewer'
): Record<string, FidelityCard> {
  const result = { ...existing };
  for (const card of imported) {
    const ex = result[card.id];
    if (!ex) {
      result[card.id] = card;
    } else {
      switch (strategy) {
        case 'keepExisting':
          break;
        case 'useImported':
          result[card.id] = card;
          break;
        case 'keepNewer':
          if (new Date(card.updatedAt) > new Date(ex.updatedAt)) {
            result[card.id] = card;
          }
          break;
      }
    }
  }
  return result;
}

async function inlineCustomLogos(cards: FidelityCard[]): Promise<FidelityCard[]> {
  return Promise.all(
    cards.map(async (card) => {
      if (!card.customLogoUri) return card;
      const dataUri = await customLogoToDataUri(card.customLogoUri);
      return { ...card, customLogoUri: dataUri ?? undefined };
    })
  );
}

export async function exportCards(
  cards: FidelityCard[],
  settings: Partial<Settings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const exportable = await inlineCustomLogos(cards);
    const data: ExportData = {
      cards: exportable,
      settings,
      exportedAt: new Date().toISOString(),
      version: '2.1.0',
    };
    const json = JSON.stringify(data, null, 2);
    const fileName = `tesserone-backup-${new Date().toISOString().split('T')[0]}.json`;
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Tesserone Data',
        UTI: 'public.json',
      });
    }
    return { success: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Failed to export data: ${detail}` };
  }
}

export async function importCards(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled) {
      return { success: false, error: 'Import cancelled' };
    }
    const file = new File(result.assets[0].uri);
    const content = await file.text();
    const data: unknown = JSON.parse(content);
    return validateImportData(data);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Failed to read or parse file: ${detail}` };
  }
}
