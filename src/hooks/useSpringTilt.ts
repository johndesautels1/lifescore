/**
 * LIFE SCORE useSpringTilt: turns an element toward the pointer like a physical
 * object — it tilts, lifts and settles on a small spring.
 *
 * The hook writes CSS custom properties on the element and never re-renders:
 *   --rx, --ry  tilt in degrees (rotateX / rotateY)
 *   --h         hover amount, 0 at rest to 1 under the pointer (drives lift, glow)
 *   --mx, --my  pointer position inside the element, in percent (drives a spotlight)
 * The stylesheet decides what each value moves.
 *
 * Off when the viewer asks for reduced motion, and on touch screens (no pointer
 * to follow): the element then keeps its resting values and its CSS hover state.
 */

import { useEffect, useRef } from 'react';

/** Spring stiffness and damping, tuned for a slight overshoot before settling. */
const STIFFNESS = 0.12;
const DAMPING = 0.74;
const REST = 0.0005;

/**
 * Attach to the element that should tilt.
 * @param maxDeg the tilt at the element's edge, in degrees.
 * @returns a ref for the element.
 */
export function useSpringTilt<T extends HTMLElement>(maxDeg: number) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (reduce || !fine) return;

    const target = { x: 0, y: 0, h: 0 };
    const value = { x: 0, y: 0, h: 0 };
    const speed = { x: 0, y: 0, h: 0 };
    const keys = ['x', 'y', 'h'] as const;
    let frame = 0;

    const step = () => {
      let moving = false;
      for (const k of keys) {
        speed[k] = (speed[k] + (target[k] - value[k]) * STIFFNESS) * DAMPING;
        value[k] += speed[k];
        if (Math.abs(target[k] - value[k]) > REST || Math.abs(speed[k]) > REST) moving = true;
      }
      el.style.setProperty('--rx', `${(-value.y * maxDeg).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(value.x * maxDeg).toFixed(2)}deg`);
      el.style.setProperty('--h', value.h.toFixed(3));
      frame = moving ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      target.x = px * 2 - 1;
      target.y = py * 2 - 1;
      target.h = 1;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      target.h = 0;
      kick();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [maxDeg]);

  return ref;
}
