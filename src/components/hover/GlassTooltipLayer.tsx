/**
 * LIFE SCORE - every `title` hint shown as a dark glass tooltip, inside the window.
 *
 * John, 4 Oct 2026: the app's hovers were the browser's own white title boxes;
 * they are to be dark glass, and stay inside the window. Mounted once (App), this
 * listens on the document: when a mouse rests on an element with a `title` (or
 * the keyboard focuses one), it lifts the title off the element so the browser
 * does not draw its own box, shows the same words in glass beside the element
 * (placeHover), and puts the title back when the pointer or focus leaves.
 *
 * Touch screens have no hover, so a tap shows nothing here (as before); the
 * app's hover cards (GlassHover) open in the centre of the screen there.
 */

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeHover } from './placeHover';
import './glassHover.css';

/** How long the pointer rests before the tip appears (the browser's own is slower). */
const SHOW_DELAY_MS = 450;

interface Tip {
  text: string;
  anchor: HTMLElement;
}

export const GlassTooltipLayer: React.FC = () => {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  useEffect(() => {
    let current: HTMLElement | null = null;
    let timer: number | undefined;
    let describedBy = false;

    const restore = (el: HTMLElement) => {
      const text = el.dataset.glassTitle;
      if (text !== undefined) {
        el.setAttribute('title', text);
        delete el.dataset.glassTitle;
      }
      if (describedBy) {
        el.removeAttribute('aria-describedby');
        describedBy = false;
      }
    };

    const hide = () => {
      window.clearTimeout(timer);
      if (current) restore(current);
      current = null;
      setTip(null);
    };

    const showFor = (el: HTMLElement, delay: number) => {
      if (current === el) return;
      hide();
      const text = el.getAttribute('title');
      if (!text || !text.trim()) return;
      // Lift the title so the browser does not draw its own white box.
      el.dataset.glassTitle = text;
      el.removeAttribute('title');
      if (!el.hasAttribute('aria-describedby')) {
        el.setAttribute('aria-describedby', id);
        describedBy = true;
      }
      current = el;
      timer = window.setTimeout(() => {
        if (current === el && el.isConnected) setTip({ text, anchor: el });
      }, delay);
    };

    const titled = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const el = target.closest('[title]');
      if (!(el instanceof HTMLElement) || el.closest('.glass-hover')) return null;
      return el;
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = titled(e.target);
      if (el) showFor(el, SHOW_DELAY_MS);
    };
    const onOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget;
      if (to instanceof Node && current.contains(to)) return;
      hide();
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = titled(e.target);
      if (el && el.matches(':focus-visible')) showFor(el, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('scroll', hide, { capture: true });
      hide();
    };
  }, [id]);

  // Beside the element, inside the window.
  useLayoutEffect(() => {
    const card = tipRef.current;
    if (!tip || !card) return;
    const a = tip.anchor.getBoundingClientRect();
    const spot = placeHover(
      { top: a.top, left: a.left, width: a.width, height: a.height },
      { width: card.offsetWidth, height: card.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      'below'
    );
    card.style.top = `${spot.top}px`;
    card.style.left = `${spot.left}px`;
  }, [tip]);

  if (!tip || typeof document === 'undefined') return null;
  return createPortal(
    <div ref={tipRef} id={id} role="tooltip" className="glass-hover glass-hover--placed glass-hover--tip">
      {tip.text}
    </div>,
    document.body
  );
};

export default GlassTooltipLayer;
