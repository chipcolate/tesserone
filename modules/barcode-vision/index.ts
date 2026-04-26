import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { DetectedBarcode } from './src/BarcodeVision.types';

interface NativeBarcodeVision {
  detectBarcodesInImage(uri: string): Promise<DetectedBarcode[]>;
}

const Native =
  Platform.OS === 'ios'
    ? (requireOptionalNativeModule('BarcodeVision') as NativeBarcodeVision | null)
    : null;

export async function detectBarcodesInImage(uri: string): Promise<DetectedBarcode[]> {
  if (!Native) return [];
  return Native.detectBarcodesInImage(uri);
}

export type { DetectedBarcode };
