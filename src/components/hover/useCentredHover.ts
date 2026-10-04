/**
 * LIFE SCORE - whether hovers open in the centre of the screen (phones and touch screens).
 *
 * Read with useSyncExternalStore so the answer follows the window as it changes,
 * with no state set inside an effect. Used by GlassHover.
 */

import { useSyncExternalStore } from 'react';
import { CENTRED_HOVER_QUERY } from './placeHover';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(CENTRED_HOVER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const read = () => window.matchMedia(CENTRED_HOVER_QUERY).matches;
const readOnServer = () => false;

/** True on phones and touch screens, where hovers open in the centre of the screen. */
export function useCentredHover(): boolean {
  return useSyncExternalStore(subscribe, read, readOnServer);
}
