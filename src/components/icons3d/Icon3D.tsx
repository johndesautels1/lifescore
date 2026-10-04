/**
 * LIFE SCORE Icon3D: draws one rendered 3D icon (src/components/icons3d/icons3d.ts).
 *
 * Decorative by default (empty alt, hidden from screen readers): the button or
 * link it sits in carries the words. Pass `label` only when the icon is the sole
 * content and has a meaning of its own.
 */

import React from 'react';
import { ICONS_3D, type Icon3DName } from './icons3d';

interface Icon3DProps {
  /** Which icon (a key of ICONS_3D). */
  name: Icon3DName;
  /** Drawn width and height in CSS pixels. */
  size: number;
  className?: string;
  /** Spoken name, for an icon that stands alone. Omit for a decorative icon. */
  label?: string;
}

/** One 3D icon, square, never dragged, decoded off the main thread. */
const Icon3D: React.FC<Icon3DProps> = ({ name, size, className, label }) => (
  <img
    src={ICONS_3D[name]}
    width={size}
    height={size}
    alt={label ?? ''}
    aria-hidden={label ? undefined : true}
    className={className}
    decoding="async"
    draggable={false}
  />
);

export default Icon3D;
