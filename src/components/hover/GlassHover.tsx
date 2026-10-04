/**
 * LIFE SCORE - the one hover card: dark glass, centred on mobile, inside the window on desktop.
 *
 * John, 4 Oct 2026: "we use dark glass morphic hovers codebase wide … we want
 * all hovers to be center of screen on mobile and within the viewpane on
 * desktop." Every hover card in the app renders through this.
 *
 * - Drawn in a portal on <body>: a card inside a tilted or blurred panel
 *   (transform / backdrop-filter) cannot be fixed to the screen, so it is never
 *   placed inside one.
 * - Phones and touch screens (CENTRED_HOVER_QUERY): centred on the screen over a
 *   dimmed backdrop; a tap on the backdrop closes it.
 * - Desktop: beside its anchor (placeHover), flipped and clamped so it stays in
 *   the window, and kept there while the page scrolls or resizes.
 * - Escape closes it; so does a press outside the card and its anchor.
 */

import React, { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { placeHover, type Side } from './placeHover';
import { useCentredHover } from './useCentredHover';
import './glassHover.css';

export interface GlassHoverProps {
  /** The element the card belongs to (positions it on desktop). */
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Which side of the anchor to try first on desktop. */
  prefer?: Side;
  /** 'tooltip' for a passive hint, 'dialog' for a card with controls. */
  role?: 'tooltip' | 'dialog';
  /** Accessible name when the card has no visible heading. */
  label?: string;
  className?: string;
  /** Extra width rule, e.g. 'min(340px, calc(100vw - 32px))'. */
  width?: string;
  /** Let the pointer move from the anchor into the card without closing (desktop hover cards). */
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  children: React.ReactNode;
}

export const GlassHover: React.FC<GlassHoverProps> = ({
  anchorRef,
  open,
  onClose,
  prefer = 'above',
  role = 'dialog',
  label,
  className,
  width,
  onPointerEnter,
  onPointerLeave,
  children,
}) => {
  const centred = useCentredHover();
  const ownRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // Desktop: place beside the anchor, inside the window, and keep it there.
  useLayoutEffect(() => {
    if (!open || centred) return;
    let frame = 0;
    const place = () => {
      const card = ownRef.current;
      const anchor = anchorRef.current;
      if (!card || !anchor) return;
      const a = anchor.getBoundingClientRect();
      const spot = placeHover(
        { top: a.top, left: a.left, width: a.width, height: a.height },
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        prefer
      );
      card.style.top = `${spot.top}px`;
      card.style.left = `${spot.left}px`;
      card.dataset.side = spot.side;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [open, centred, prefer, anchorRef]);

  // Escape, and a press outside the card and its anchor, close it. When centred,
  // the backdrop takes that tap itself, so it cannot fall through to whatever
  // lies underneath once the card is gone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPress = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ownRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    if (!centred) document.addEventListener('pointerdown', onPress, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress, true);
    };
  }, [open, onClose, anchorRef, centred]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {centred && <div className="glass-hover-scrim" aria-hidden="true" onClick={onClose} />}
      <div
        ref={ownRef}
        id={id}
        role={role}
        aria-label={label}
        className={`glass-hover ${centred ? 'glass-hover--centred' : 'glass-hover--placed'}${className ? ` ${className}` : ''}`}
        style={width ? { width } : undefined}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

export default GlassHover;
