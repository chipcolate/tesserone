import { Platform } from 'react-native';
import { scanFromURLAsync, type BarcodeType } from 'expo-camera';
import * as BarcodeVision from '../../modules/barcode-vision';
import { mapBarcodeType, fixScannedCode } from './scanner';
import type { BarcodeFormat } from '../types';

export type ImageScanResult =
  | { kind: 'detected'; code: string; format: BarcodeFormat }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string };

const ANDROID_BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'ean13',
  'ean8',
  'code128',
  'code39',
  'upc_a',
  'upc_e',
  'pdf417',
  'aztec',
  'datamatrix',
  'itf14',
];

export async function scanBarcodeFromImage(uri: string): Promise<ImageScanResult> {
  try {
    let raw: { data: string; type: string } | undefined;
    if (Platform.OS === 'ios') {
      const detected = await BarcodeVision.detectBarcodesInImage(uri);
      raw = detected[0];
    } else {
      const detected = await scanFromURLAsync(uri, ANDROID_BARCODE_TYPES);
      raw = detected[0];
    }
    if (!raw || !raw.data) return { kind: 'notFound' };
    const fixed = fixScannedCode(raw.data.trim(), mapBarcodeType(raw.type));
    return { kind: 'detected', code: fixed.code, format: fixed.format };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
