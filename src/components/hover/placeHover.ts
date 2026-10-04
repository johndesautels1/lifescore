/**
 * LIFE SCORE - where a hover card goes on a desktop screen.
 *
 * John, 4 Oct 2026: hovers are dark glass, open in the centre of the screen on
 * mobile and stay inside the window on desktop. This is the desktop half: put
 * the card on the preferred side of its anchor, flip to the other side when it
 * does not fit, and keep every edge at least `margin` inside the viewport.
 * Pure arithmetic, so it is tested without a browser (tests/glassHover.test.ts).
 */

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Side = 'above' | 'below';

export interface Placement {
  top: number;
  left: number;
  side: Side;
}

/** The gap between the anchor and the card. */
export const HOVER_GAP = 10;
/** The least distance between the card and the window's edge. */
export const HOVER_MARGIN = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * The card's top-left corner in viewport coordinates.
 *
 * Centred on the anchor horizontally; on `prefer`'s side when there is room,
 * else the other side when there is room there, else whichever side has more
 * room — then clamped so the card stays in the viewport.
 */
export function placeHover(anchor: Box, card: Size, viewport: Size, prefer: Side = 'above', margin = HOVER_MARGIN, gap = HOVER_GAP): Placement {
  const roomAbove = anchor.top - gap - margin;
  const roomBelow = viewport.height - (anchor.top + anchor.height) - gap - margin;
  const fitsAbove = card.height <= roomAbove;
  const fitsBelow = card.height <= roomBelow;

  let side: Side;
  if (prefer === 'above') side = fitsAbove ? 'above' : fitsBelow ? 'below' : roomAbove >= roomBelow ? 'above' : 'below';
  else side = fitsBelow ? 'below' : fitsAbove ? 'above' : roomBelow >= roomAbove ? 'below' : 'above';

  const wantedTop = side === 'above' ? anchor.top - gap - card.height : anchor.top + anchor.height + gap;
  const wantedLeft = anchor.left + anchor.width / 2 - card.width / 2;

  return {
    side,
    top: clamp(wantedTop, margin, viewport.height - card.height - margin),
    left: clamp(wantedLeft, margin, viewport.width - card.width - margin),
  };
}

/** Phones and touch screens: hovers open in the centre of the screen instead. */
export const CENTRED_HOVER_QUERY = '(max-width: 640px), (hover: none)';
