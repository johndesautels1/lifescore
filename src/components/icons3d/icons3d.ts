/**
 * LIFE SCORE 3D icons: the one list of the rendered icons the app draws.
 *
 * Every file in src/assets/icons3d/ is imported here once, so Vite fingerprints
 * it and a page can only name an icon that exists. Source, licence (CC0) and the
 * original names: src/assets/icons3d/README.md. tests/icons3d.test.ts holds this
 * list and the folder equal.
 */

import type { CategoryId } from '../../types/metrics';

import banknotes from '../../assets/icons3d/banknotes.webp';
import bookmark from '../../assets/icons3d/bookmark.webp';
import briefcase from '../../assets/icons3d/briefcase.webp';
import chart from '../../assets/icons3d/chart.webp';
import compass from '../../assets/icons3d/compass.webp';
import computer from '../../assets/icons3d/computer.webp';
import documentIcon from '../../assets/icons3d/document.webp';
import dollar from '../../assets/icons3d/dollar.webp';
import flag from '../../assets/icons3d/flag.webp';
import heart from '../../assets/icons3d/heart.webp';
import key from '../../assets/icons3d/key.webp';
import link from '../../assets/icons3d/link.webp';
import magnifier from '../../assets/icons3d/magnifier.webp';
import mail from '../../assets/icons3d/mail.webp';
import mapPin from '../../assets/icons3d/map-pin.webp';
import medal from '../../assets/icons3d/medal.webp';
import megaphone from '../../assets/icons3d/megaphone.webp';
import mic from '../../assets/icons3d/mic.webp';
import navigation from '../../assets/icons3d/navigation.webp';
import phone from '../../assets/icons3d/phone.webp';
import picture from '../../assets/icons3d/picture.webp';
import rocket from '../../assets/icons3d/rocket.webp';
import shield from '../../assets/icons3d/shield.webp';
import target from '../../assets/icons3d/target.webp';

/** Every 3D icon, by name, as the fingerprinted URL Vite serves. */
export const ICONS_3D = {
  banknotes,
  bookmark,
  briefcase,
  chart,
  compass,
  computer,
  document: documentIcon,
  dollar,
  flag,
  heart,
  key,
  link,
  magnifier,
  mail,
  'map-pin': mapPin,
  medal,
  megaphone,
  mic,
  navigation,
  phone,
  picture,
  rocket,
  shield,
  target,
} as const satisfies Record<string, string>;

/** The name of a 3D icon the app can draw. */
export type Icon3DName = keyof typeof ICONS_3D;

/** The 3D icon for each of the six scoring categories (src/shared/metrics.ts). */
export const CATEGORY_ICON_3D = {
  personal_freedom: 'key',
  housing_property: 'map-pin',
  business_work: 'briefcase',
  transportation: 'navigation',
  policing_legal: 'shield',
  speech_lifestyle: 'megaphone',
} as const satisfies Record<CategoryId, Icon3DName>;
