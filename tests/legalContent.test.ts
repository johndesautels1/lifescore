/**
 * LIFE SCORE - the legal pages stay whole, true to the code, and in one place (anti-drift).
 *
 * Until 2026-10-03 the pop-up and docs/legal held two different copies of the
 * policies; the privacy page listed five suppliers when the code called twenty,
 * promised Settings buttons that did not exist, and named a personal Gmail
 * address. These tests keep the words in one source, keep the documents
 * generated from it, keep every supplier the code calls in the register, and
 * keep every "door" the pages name pointing at a real button.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL_SLUGS, legalPage, parseBody } from '../src/legal/legalContent';
import { LEGAL_FACTS } from '../src/legal/legalFacts';
import { LEGAL_DOC_PATHS, legalMarkdown } from '../src/legal/legalMarkdown';
import { SUB_PROCESSORS } from '../src/legal/subProcessors';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

const allPages = LEGAL_SLUGS.map(legalPage);
const allText = allPages.flatMap((p) => p.sections.map((s) => `${s.heading}\n${s.body}`)).join('\n');

describe('the seven legal pages', () => {
  it('each has a title, the effective date and sections with words', () => {
    for (const page of allPages) {
      expect(page.title, page.slug).toBeTruthy();
      expect(page.effective, page.slug).toBeTruthy();
      expect(page.sections.length, page.slug).toBeGreaterThan(0);
      for (const s of page.sections) expect(parseBody(s.body).length, `${page.slug}/${s.id}`).toBeGreaterThan(0);
    }
  });

  it('every {hole} is filled from the facts', () => {
    expect(allText).not.toMatch(/\{\w+\}/);
  });

  it('name the company contact, never a personal mailbox', () => {
    expect(allText).toContain(LEGAL_FACTS.contact);
    expect(allText).not.toMatch(/@gmail\.com/);
  });

  it('state the minimum age the founder set (18)', () => {
    expect(LEGAL_FACTS.minimumAge).toBe('18');
    const privacy = legalPage('privacy').sections.find((s) => s.id === 'age');
    expect(privacy?.body).toContain('18 or older');
  });
});

describe('the documents are generated from the same words', () => {
  it('docs/legal matches the pop-up text (node scripts/build-legal-docs.mjs refreshes it)', () => {
    for (const slug of LEGAL_SLUGS) {
      const file = readFileSync(LEGAL_DOC_PATHS[slug], 'utf8').replace(/\r\n/g, '\n');
      expect(file, LEGAL_DOC_PATHS[slug]).toBe(legalMarkdown(slug));
    }
  });
});

describe('the supplier register names every supplier the code calls', () => {
  /** A web address in the code → the register entry that must disclose it. */
  const HOSTS: Array<[RegExp, string]> = [
    [/api\.anthropic\.com/, 'Anthropic'],
    [/api\.openai\.com/, 'OpenAI'],
    [/generativelanguage\.googleapis\.com/, 'Google'],
    [/api\.x\.ai/, 'xAI'],
    [/api\.perplexity\.ai/, 'Perplexity'],
    [/api\.tavily\.com/, 'Tavily'],
    [/gamma\.app/, 'Gamma'],
    [/api\.heygen\.com|api\.liveavatar\.com/, 'HeyGen'],
    [/api\.elevenlabs\.io/, 'ElevenLabs'],
    [/simli\.ai/, 'Simli'],
    [/api\.d-id\.com/, 'D-ID'],
    [/api\.replicate\.com/, 'Replicate'],
    [/klingai\.com/, 'Kling'],
    [/invideo\.io/, 'InVideo'],
    [/api\.resend\.com/, 'Resend'],
    [/from 'stripe'/, 'Stripe'],
    [/flagcdn\.com/, 'Flagpedia'],
  ];
  const code = [...sourceFiles('api'), ...sourceFiles('src')]
    .filter((f) => !f.startsWith('src/legal/'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  it('no supplier the code reaches is missing from the register', () => {
    const missing = HOSTS.filter(([host, name]) => host.test(code) && !SUB_PROCESSORS.some((p) => p.name.includes(name)));
    expect(missing.map(([, name]) => name)).toEqual([]);
  });

  it('the database and hosting are listed with where they run', () => {
    expect(SUB_PROCESSORS.find((p) => p.name === 'Supabase')?.jurisdiction).toContain('Frankfurt');
    expect(SUB_PROCESSORS.find((p) => p.name === 'Vercel')?.jurisdiction).toContain('Frankfurt');
  });
});

describe('every door the pages name exists', () => {
  const settings = readFileSync('src/components/SettingsModal.tsx', 'utf8');
  const footer = readFileSync('src/components/Footer.tsx', 'utf8');

  it('Settings → Data → Download My Data / Delete My Account', () => {
    expect(allText).toContain('Settings → Data → Download My Data');
    expect(settings).toContain('Download My Data');
    expect(allText).toContain('Settings → Data → Delete My Account');
    expect(settings).toContain('Delete My Account');
  });

  it('Settings → Subscription → Manage Subscription', () => {
    expect(allText).toContain('Settings → Subscription → Manage Subscription');
    expect(settings).toContain("'Manage Subscription'");
  });

  it('Cookie Settings in the footer', () => {
    expect(allText).toContain('Cookie Settings');
    expect(footer).toContain('Cookie Settings');
  });
});
