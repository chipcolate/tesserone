import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Barcode, { type Format } from '@kichiyaki/react-native-barcode-generator';
import QRCode from 'react-native-qrcode-svg';
import { FidelityCard, BarcodeFormat } from '../../types';
import { typography, textOnColor } from '../../theme';
import { resolveCardColor } from '../../services/logos';
import { CARD_RADIUS, TILE_RADIUS } from '../../theme/geometry';

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
 * Back face of a wallet card. Theme-aware surface, but the barcode/QR always
 * sits on a solid white tile so scanners keep reliable contrast regardless of
 * light/dark mode.
 */
export const CardBack = React.memo(function CardBack({ card }: CardBackProps) {
  // The back keeps the same color as the front face.
  const bg = resolveCardColor(card.color, card.logoSlug);
  const fg = textOnColor(bg);
  const [error, setError] = useState(false);
  const isQR = QR_FORMATS.has(card.format);

  return (
    <View style={[styles.back, { backgroundColor: bg }]}>
      <View style={styles.tile}>
        {error ? (
          <Text style={styles.errorText}>Could not render barcode</Text>
        ) : isQR ? (
          <QRCode value={card.code} size={220} backgroundColor="#FFFFFF" />
        ) : (
          <Barcode
            value={card.code}
            format={barcodeLibFormat(card.format)}
            width={2.4}
            height={130}
            background="#FFFFFF"
            lineColor="#000000"
            onError={() => setError(true)}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[typography.cardName, { color: fg }]} numberOfLines={1}>
          {card.name}
        </Text>

        <Text style={[typography.barcode, { color: fg, opacity: 0.7 }]}>{card.code}</Text>

        {card.notes ? (
          <Text
            style={[typography.caption, styles.notes, { color: fg, opacity: 0.7 }]}
            numberOfLines={3}
          >
            {card.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  back: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    padding: 24,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: TILE_RADIUS,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  notes: {
    textAlign: 'center',
    maxWidth: '90%',
  },
  errorText: {
    color: '#999999',
    fontSize: 14,
  },
});
