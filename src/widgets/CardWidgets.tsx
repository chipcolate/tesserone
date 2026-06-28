import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { i18n } from '../i18n';
import { TILE_RADIUS } from '../theme/geometry';
import type { WidgetCardData } from './data';

const openUri = (id: string) => ({ uri: `tesserone://open/${id}` });

/** Widget chrome colors, light/dark — matches the app's Raw-Aesthetic theme. */
export type WidgetTheme = 'light' | 'dark';
const THEME: Record<WidgetTheme, { bg: `#${string}`; text: `#${string}` }> = {
  light: { bg: '#FAFAF8', text: '#1A1A1A' },
  dark: { bg: '#0A0A0A', text: '#F5F5F5' },
};

/** Fit a logo of the given aspect ratio inside a square box without stretching. */
function fitInBox(aspect: number, box: number): { width: number; height: number } {
  if (aspect >= 1) return { width: box, height: Math.round(box / aspect) };
  return { width: Math.round(box * aspect), height: box };
}

/** Logo image, or a monospace initial fallback on the card's background. */
function LogoOrInitial({ card, size }: { card: WidgetCardData; size: number }) {
  if (card.image != null) {
    const { width, height } = fitInBox(card.imageAspect, size);
    return (
      <ImageWidget
        image={card.image as number | `data:image${string}`}
        imageWidth={width}
        imageHeight={height}
      />
    );
  }
  // System 'monospace' (not the app's JetBrains Mono) is deliberate: this runs in
  // the Android widget's own RemoteViews process where the JS-registered UI font
  // isn't available. Matches the Apple Watch companion, which likewise renders in
  // the system monospaced face. See also CardViews.swift (iOS widget).
  return (
    <TextWidget
      text={card.initial}
      style={{
        fontSize: Math.round(size * 0.5),
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: card.textColor,
      }}
    />
  );
}

function EmptyWidget({ theme }: { theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: THEME[theme].bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
      }}
    >
      <TextWidget
        text={i18n.t('widget.empty')}
        style={{ fontSize: 12, fontFamily: 'monospace', color: THEME[theme].text, textAlign: 'center' }}
      />
    </FlexWidget>
  );
}

/** 1x1 single-card widget: logo on the card color, tap opens the card. */
export function SingleCardWidget({
  card,
  theme,
}: {
  card: WidgetCardData | null;
  theme: WidgetTheme;
}) {
  if (!card) return <EmptyWidget theme={theme} />;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={openUri(card.id)}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: card.color,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: TILE_RADIUS,
        padding: 8,
      }}
    >
      <LogoOrInitial card={card} size={56} />
    </FlexWidget>
  );
}

const GAP = 6;
const PAD = 6;
const MIN_TILE = 52; // smallest a tile may get before we drop a column
const MAX_TILE = 88; // keep tiles from ballooning on large widgets

/**
 * Medium/large list widget: a grid of tappable card tiles sized to the widget's
 * actual dimensions (in dp) so tiles never clip. Columns are derived from the
 * available width and rows from the height; any cards beyond what fits are
 * omitted (the user picks the subset to show).
 */
export function CardListWidget({
  cards,
  width,
  height,
  theme,
}: {
  cards: WidgetCardData[];
  width: number;
  height: number;
  theme: WidgetTheme;
}) {
  if (!cards.length) return <EmptyWidget theme={theme} />;

  // width/height arrive in dp; guard against 0/undefined on first add.
  const w = width > 0 ? width : 250;
  const h = height > 0 ? height : 110;
  const innerW = w - PAD * 2;
  const innerH = h - PAD * 2;

  const cols = Math.max(
    1,
    Math.min(cards.length, Math.floor((innerW + GAP) / (MIN_TILE + GAP)))
  );
  const tile = Math.min(MAX_TILE, Math.floor((innerW - GAP * (cols - 1)) / cols));
  const rowsThatFit = Math.max(1, Math.floor((innerH + GAP) / (tile + GAP)));
  const shown = cards.slice(0, cols * rowsThatFit);

  const rows: WidgetCardData[][] = [];
  for (let i = 0; i < shown.length; i += cols) rows.push(shown.slice(i, i + cols));

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: THEME[theme].bg,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: PAD,
        flexGap: GAP,
      }}
    >
      {rows.map((row, ri) => (
        <FlexWidget
          key={ri}
          style={{ flexDirection: 'row', width: 'wrap_content', height: tile, flexGap: GAP }}
        >
          {row.map((card) => (
            <FlexWidget
              key={card.id}
              clickAction="OPEN_URI"
              clickActionData={openUri(card.id)}
              style={{
                height: tile,
                width: tile,
                backgroundColor: card.color,
                borderRadius: TILE_RADIUS,
                justifyContent: 'center',
                alignItems: 'center',
                padding: Math.round(tile * 0.14),
              }}
            >
              <LogoOrInitial card={card} size={Math.round(tile * 0.66)} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
