import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Barcode, { type Format } from '@kichiyaki/react-native-barcode-generator';
import QRCode from 'react-native-qrcode-svg';
import { FidelityCard, BarcodeFormat } from '../../types';
import { typography } from '../../theme';

interface CardBackProps {
  card: FidelityCard;
}

/** Formats rendered as QR via react-native-qrcode-svg. */
const QR_FORMATS: Set<BarcodeFormat> = new Set(['QR', 'AZTEC', 'DATAMATRIX', 'PDF417']);

/**
 * Maps our BarcodeFormat to the barcode-generator library's Format type.
 * QR/AZTEC/DATAMATRIX/PDF417 are handled separately via QRCode component.
 */
function barcodeLibFormat(format: BarcodeFormat): Format {
  const map: Partial<Record<BarcodeFormat, Format>> = {
    EAN13: 'EAN13',
    EAN8: 'EAN8',
    CODE128: 'CODE128',
    CODE39: 'CODE39',
    UPCA: 'UPC',
    UPCE: 'UPCE',
    ITF14: 'ITF14',
  };
  return map[format] ?? 'CODE128';
}

/**
 * Back face of a wallet card. Renders the barcode.
 * QR codes use react-native-qrcode-svg; everything else uses
 * @kichiyaki/react-native-barcode-generator.
 */
export const CardBack = React.memo(function CardBack({ card }: CardBackProps) {
  const [error, setError] = useState(false);
  const isQR = QR_FORMATS.has(card.format);

  return (
    <View style={styles.back}>
      <Text style={[typography.cardName, styles.name]} numberOfLines={1}>
        {card.name}
      </Text>

      <View style={styles.barcodeWrap}>
        {error ? (
          <Text style={styles.errorText}>Could not render barcode</Text>
        ) : isQR ? (
          <QRCode value={card.code} size={180} backgroundColor="#FFFFFF" />
        ) : (
          <Barcode
            value={card.code}
            format={barcodeLibFormat(card.format)}
            width={1.8}
            height={100}
            background="#FFFFFF"
            lineColor="#000000"
            onError={() => setError(true)}
          />
        )}
      </View>

      <Text style={[typography.barcode, styles.code]}>{card.code}</Text>

      {card.notes ? (
        <Text style={[typography.caption, styles.notes]} numberOfLines={3}>
          {card.notes}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  back: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  name: {
    color: '#1A1A1A',
  },
  barcodeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  code: {
    color: '#333333',
  },
  notes: {
    color: '#555555',
    textAlign: 'center',
    maxWidth: '90%',
  },
  errorText: {
    color: '#999999',
    fontSize: 14,
  },
});
