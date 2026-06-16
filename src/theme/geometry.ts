/**
 * Single source of truth for corner geometry in the "Raw Aesthetics" redesign.
 * Everything is squared off — chrome and cards alike (the squared-card variant
 * won the on-device A/B over the rounded "plastic card" look).
 */

/** Chrome (buttons, inputs, panels, sheets, FAB). */
export const CHROME_RADIUS = 4;

/** Card object radius — squared to match the chrome. */
export const CARD_RADIUS = 2;

/** Inner radius for the white barcode tile on the card back — squared like the chrome. */
export const TILE_RADIUS = 2;
