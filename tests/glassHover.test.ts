/**
 * LIFE SCORE - dark glass hovers: inside the window on desktop, centred on mobile (anti-drift).
 *
 * John, 4 Oct 2026: "we use dark glass morphic hovers codebase wide … we want
 * all hovers to be center of screen on mobile and within the viewpane on
 * desktop." placeHover's arithmetic runs here; the rest holds that every hover
 * goes through src/components/hover.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CENTRED_HOVER_QUERY, HOVER_GAP, HOVER_MARGIN, placeHover } from '../src/components/hover/placeHover';

const viewport = { width: 1280, height: 800 };
const card = { width: 300, height: 120 };
const read = (path: string) => readFileSync(path, 'utf8');

describe('placeHover (desktop)', () => {
  it('sits above the anchor, centred on it, when there is room', () => {
    const spot = placeHover({ top: 400, left: 600, width: 40, height: 20 }, card, viewport, 'above');
    expect(spot.side).toBe('above');
    expect(spot.top).toBe(400 - HOVER_GAP - 120);
    expect(spot.left).toBe(620 - 150);
  });

  it('flips below when there is no room above', () => {
    const spot = placeHover({ top: 30, left: 600, width: 40, height: 20 }, card, viewport, 'above');
    expect(spot.side).toBe('below');
    expect(spot.top).toBe(30 + 20 + HOVER_GAP);
  });

  it('flips above when asked for below at the bottom of the window', () => {
    const spot = placeHover({ top: 760, left: 600, width: 40, height: 20 }, card, viewport, 'below');
    expect(spot.side).toBe('above');
  });

  it('never leaves the window at the left or right edge', () => {
    const left = placeHover({ top: 400, left: 0, width: 20, height: 20 }, card, viewport);
    expect(left.left).toBe(HOVER_MARGIN);
    const right = placeHover({ top: 400, left: 1270, width: 10, height: 20 }, card, viewport);
    expect(right.left).toBe(viewport.width - card.width - HOVER_MARGIN);
  });

  it('stays inside the window even when it fits on neither side', () => {
    const tall = { width: 300, height: 700 };
    const spot = placeHover({ top: 380, left: 600, width: 40, height: 40 }, tall, viewport);
    expect(spot.top >= HOVER_MARGIN).toBe(true);
    expect(spot.top + tall.height <= viewport.height - HOVER_MARGIN).toBe(true);
  });
});

describe('mobile: centred', () => {
  it('phones and touch screens use the centred card', () => {
    expect(CENTRED_HOVER_QUERY.includes('(max-width: 640px)')).toBe(true);
    expect(CENTRED_HOVER_QUERY.includes('(hover: none)')).toBe(true);
  });

  it('the centred card is fixed to the middle of the screen', () => {
    const css = read('src/components/hover/glassHover.css').replace(/\r\n/g, '\n');
    const rule = css.slice(css.indexOf('.glass-hover--centred {'), css.indexOf('}', css.indexOf('.glass-hover--centred {')));
    expect(rule.includes('top: 50%;')).toBe(true);
    expect(rule.includes('left: 50%;')).toBe(true);
    expect(rule.includes('transform: translate(-50%, -50%);')).toBe(true);
  });

  it('cards are drawn on <body>, so no tilted or blurred panel can trap them', () => {
    expect(read('src/components/hover/GlassHover.tsx').includes('document.body')).toBe(true);
    expect(read('src/components/hover/GlassTooltipLayer.tsx').includes('document.body')).toBe(true);
  });
});

describe('every hover in the app is a glass hover', () => {
  it('title hints: the glass layer is mounted for every screen', () => {
    expect(read('src/App.tsx').includes('<GlassTooltipLayer />')).toBe(true);
  });

  it('the Enhanced results "why this matters" card', () => {
    const tsx = read('src/components/EnhancedComparison.tsx');
    expect(tsx.includes('<MetricWhyHover')).toBe(true);
    expect(tsx.includes('className="tooltip-content"')).toBe(false);
    expect(read('src/components/EnhancedComparison-results.css').includes('.tooltip-content')).toBe(false);
  });

  it('the Judge tab confidence cards', () => {
    const tsx = read('src/components/JudgeTab.tsx');
    expect(tsx.split('<GlassHover ').length - 1).toBe(3);
    expect(tsx.includes('<div className="confidence-hover-card')).toBe(false);
  });

  it('the Emilia and Olivia buttons have one hover each (their title)', () => {
    expect(read('src/components/HelpBubble.tsx').includes('help-bubble-tooltip')).toBe(false);
    const olivia = read('src/components/OliviaChatBubble.tsx');
    expect(olivia.includes('fab-tooltip')).toBe(false);
    expect(olivia.includes('title="Chat with Olivia"')).toBe(true);
  });
});
