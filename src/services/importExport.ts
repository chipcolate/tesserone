import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FidelityCard, BarcodeFormat, Settings } from '../types';

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

// --- V1 format migration ---

/** Map v1 lowercase format strings to v2 uppercase. */
const V1_FORMAT_MAP: Record<string, BarcodeFormat> = {
  qr: 'QR', ean13: 'EAN13', ean8: 'EAN8', code128: 'CODE128',
  code39: 'CODE39', upcA: 'UPCA', upcE: 'UPCE', pdf417: 'PDF417',
  aztec: 'AZTEC', datamatrix: 'DATAMATRIX', itf: 'ITF14', unknown: 'CODE128',
};

function migrateCard(card: any, index: number): FidelityCard {
  return {
    id: card.id,
    name: card.name,
    code: card.code,
    format: V1_FORMAT_MAP[card.format] ?? card.format,
    color: card.color,
    logoSlug: card.logoSlug,
    customLogoUri: card.customLogoUri,
    notes: card.notes,
    sortIndex: card.sortIndex ?? index,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

// --- Validation ---

function validateImportData(data: any): ImportResult {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Invalid file format' };
  }
  if (!Array.isArray(data.cards)) {
    return { success: false, error: 'Missing or invalid cards array' };
  }
  for (const card of data.cards) {
    if (!card.id || !card.name || !card.code || !card.format) {
      return { success: false, error: 'Invalid card data — missing required fields' };
    }
  }
  // Migrate cards (handles v1 format)
  const migrated: FidelityCard[] = data.cards.map(migrateCard);
  return {
    success: true,
    data: { ...data, cards: migrated, version: data.version ?? '1.0.0' },
  };
}

// --- Merge ---

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

// --- Export ---

export async function exportCards(
  cards: FidelityCard[],
  settings: Partial<Settings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const data: ExportData = {
      cards,
      settings,
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
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
  } catch {
    return { success: false, error: 'Failed to export data' };
  }
}

// --- Import ---

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
    const data = JSON.parse(content);
    return validateImportData(data);
  } catch {
    return { success: false, error: 'Failed to read or parse file' };
  }
}
