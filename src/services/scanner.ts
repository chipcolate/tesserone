import { BarcodeFormat, BarcodeFormatOption } from '../types';

/**
 * Selectable barcode format options shown in the add/edit screens.
 * Order defines UI ordering.
 */
export const BARCODE_FORMAT_OPTIONS: BarcodeFormatOption[] = [
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'CODE128', label: 'Code 128' },
  { value: 'CODE39', label: 'Code 39' },
  { value: 'QR', label: 'QR' },
  { value: 'UPCA', label: 'UPC-A' },
  { value: 'UPCE', label: 'UPC-E' },
];

/**
 * Map expo-camera barcode type strings to our internal BarcodeFormat.
 */
export function mapBarcodeType(type: string): BarcodeFormat {
  const map: Record<string, BarcodeFormat> = {
    qr: 'QR',
    ean13: 'EAN13',
    ean8: 'EAN8',
    code128: 'CODE128',
    code39: 'CODE39',
    upc_a: 'UPCA',
    upc_e: 'UPCE',
    pdf417: 'PDF417',
    aztec: 'AZTEC',
    datamatrix: 'DATAMATRIX',
    itf14: 'ITF14',
    itf: 'ITF14',
  };
  return map[type.toLowerCase()] || 'CODE128';
}

/**
 * Validate a barcode value against its format.
 */
export function validateBarcode(code: string, format: BarcodeFormat): boolean {
  const c = code?.trim();
  if (!c) return false;
  switch (format) {
    case 'EAN13':
      return /^\d{13}$/.test(c);
    case 'EAN8':
      return /^\d{8}$/.test(c);
    case 'UPCA':
      return /^\d{12}$/.test(c);
    case 'UPCE':
      return /^\d{6,8}$/.test(c);
    case 'CODE128':
    case 'CODE39':
      return c.length > 0;
    default:
      return true;
  }
}

/**
 * Fix common scan artifacts. EAN13 codes sometimes scan as 12 digits
 * (missing leading zero).
 */
export function fixScannedCode(
  code: string,
  format: BarcodeFormat
): { code: string; format: BarcodeFormat } {
  if (format === 'EAN13' && /^\d{12}$/.test(code)) {
    return { code: '0' + code, format: 'EAN13' };
  }
  return { code, format };
}
