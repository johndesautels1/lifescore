/**
 * LIFE SCORE - the footer's contact details stay in one place, true to the legal
 * pages (anti-drift).
 *
 * John, 4 Oct 2026 ("yes swap"): the footer took the flagship's details
 * (info@cluesintelligence.com, the London and St. Pete Beach offices, LinkedIn,
 * Instagram, TikTok, Bluesky) in place of two Gmail addresses and
 * cluesnomad.com; YouTube stayed. These tests hold the London office and the
 * email to src/legal/legalFacts.ts, keep the retired contacts out of the footer,
 * and keep every legal door in it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COMPANY_CONTACT } from '../src/shared/companyContact';
import { LEGAL_FACTS } from '../src/legal/legalFacts';

const footer = readFileSync('src/components/Footer.tsx', 'utf8');

describe('company contact', () => {
  it('the London office is the address the legal pages give', () => {
    const london = COMPANY_CONTACT.offices[0];
    expect(london.name).toBe('London');
    expect(LEGAL_FACTS.address.startsWith(london.lines[0])).toBe(true);
    expect(london.lines.join(' ')).toContain('W1W 5PF');
  });

  it('the email, company and company number come from the legal facts', () => {
    expect(COMPANY_CONTACT.email).toBe(LEGAL_FACTS.contact);
    expect(COMPANY_CONTACT.company).toBe(LEGAL_FACTS.company);
    expect(COMPANY_CONTACT.companyNumber).toBe(LEGAL_FACTS.companyNumber);
  });

  it('every link is a secure address, and every office opens a Google Maps search', () => {
    for (const profile of COMPANY_CONTACT.social) expect(profile.href).toMatch(/^https:\/\//);
    expect(COMPANY_CONTACT.website.href).toMatch(/^https:\/\//);
    for (const office of COMPANY_CONTACT.offices) {
      expect(office.mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    }
    expect(COMPANY_CONTACT.phoneHref).toMatch(/^tel:\+\d+$/);
  });

  it('YouTube stayed when the contacts were swapped', () => {
    expect(COMPANY_CONTACT.social.map((p) => p.slug)).toContain('youtube');
  });
});

describe('the footer', () => {
  it('prints its contact details from the one file', () => {
    expect(footer).toContain("from '../shared/companyContact'");
    expect(footer).toContain('COMPANY_CONTACT.email');
  });

  it('carries none of the retired contacts', () => {
    for (const retired of ['cluesnomads@gmail.com', 'brokerpinellas@gmail.com', 'cluesnomad.com']) {
      expect(footer).not.toContain(retired);
    }
  });

  it('keeps every legal door', () => {
    for (const label of [
      'Privacy',
      'Terms',
      'Cookies',
      'Acceptable Use',
      'Refunds',
      'Do Not Sell or Share My Personal Information',
      'US State Privacy Rights',
      'Cookie Settings',
    ]) {
      expect(footer).toContain(label);
    }
  });
});
