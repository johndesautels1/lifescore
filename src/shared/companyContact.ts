/**
 * LIFE SCORE company contact: the one home for the offices, phone, websites and
 * social profiles the footer shows.
 *
 * Ruling, John 4 Oct 2026 ("yes swap"): the footer carries the flagship's
 * contact details (cluesintelligence.com) in place of the old Gmail addresses
 * and cluesnomad.com; YouTube stays. The email, London office and company
 * number come from src/legal/legalFacts.ts, so the footer and the legal pages
 * cannot disagree; tests/companyContact.test.ts holds the London lines to it.
 */

import { LEGAL_FACTS } from '../legal/legalFacts';

/** One office: the lines the footer prints and the Google Maps search it opens. */
export interface Office {
  name: string;
  lines: readonly string[];
  mapsUrl: string;
}

/** One social profile: the network's name, the address, and the slug its tile is styled by. */
export interface SocialProfile {
  network: string;
  href: string;
  slug: 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'bluesky' | 'youtube';
}

const maps = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** Both offices, London first (the registered address). */
const OFFICES: readonly Office[] = [
  {
    name: 'London',
    lines: ['167–169 Great Portland Street, 5th Floor', 'London W1W 5PF, UK'],
    mapsUrl: maps('167-169 Great Portland Street, London W1W 5PF, UK'),
  },
  {
    name: 'St. Pete Beach',
    lines: ['290 41st Ave, St. Pete Beach, FL 33706, USA'],
    mapsUrl: maps('290 41st Ave, St. Pete Beach, FL 33706'),
  },
];

/** The social tiles, in the order the footer shows them. */
const SOCIAL: readonly SocialProfile[] = [
  { network: 'LinkedIn', href: 'https://www.linkedin.com/in/brokerpinellas/', slug: 'linkedin' },
  { network: 'Facebook', href: 'https://www.facebook.com/johndesautels1/', slug: 'facebook' },
  { network: 'Instagram', href: 'https://instagram.com/johndesautels1', slug: 'instagram' },
  { network: 'TikTok', href: 'https://tiktok.com/@oliviamarceau', slug: 'tiktok' },
  { network: 'Bluesky', href: 'https://bsky.app/profile/johndesautels1.bsky.social', slug: 'bluesky' },
  { network: 'YouTube', href: 'https://youtube.com/@modernlodges', slug: 'youtube' },
];

/** Everything the footer prints about the company. */
export const COMPANY_CONTACT = {
  company: LEGAL_FACTS.company,
  companyNumber: LEGAL_FACTS.companyNumber,
  email: LEGAL_FACTS.contact,
  phoneDisplay: '+1 (727) 452-3506',
  phoneHref: 'tel:+17274523506',
  website: { label: 'cluesintelligence.com', href: 'https://cluesintelligence.com' },
  offices: OFFICES,
  social: SOCIAL,
} as const;
