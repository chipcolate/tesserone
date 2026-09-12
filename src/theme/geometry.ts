import geometry from '../../shared/tokens/geometry.json';

/**
 * Single source of truth for corner geometry in the "Raw Aesthetics" redesign.
 * Everything is squared off — chrome and cards alike (the squared-card variant
 * won the on-device A/B over the rounded "plastic card" look).
 */

/** Chrome (buttons, inputs, panels, sheets, FAB). */
export const CHROME_RADIUS = geometry.chromeRadius;

/** Card object radius — squared to match the chrome. */
export const CARD_RADIUS = geometry.cardRadius;

/** Inner radius for the white barcode tile on the card back — squared like the chrome. */
export const TILE_RADIUS = geometry.tileRadius;
