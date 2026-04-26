import * as BarcodeVision from '../../modules/barcode-vision';
import { mapBarcodeType, fixScannedCode } from './scanner';
import type { BarcodeFormat } from '../types';

export type ImageScanResult =
  | { kind: 'detected'; code: string; format: BarcodeFormat }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string };

export async function scanBarcodeFromImage(uri: string): Promise<ImageScanResult> {
  try {
    const detected = await BarcodeVision.detectBarcodesInImage(uri);
    const raw = detected[0];
    if (!raw || !raw.data) return { kind: 'notFound' };
    const fixed = fixScannedCode(raw.data.trim(), mapBarcodeType(raw.type));
    return { kind: 'detected', code: fixed.code, format: fixed.format };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
