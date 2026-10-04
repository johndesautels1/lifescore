/**
 * LIFE SCORE - the 3D icons stay one list (anti-drift).
 *
 * On 4 Oct 2026 the tab bar, the footer, the home hero and the preset tiles
 * moved from emoji to rendered 3D icons (John: the emoji "look cheap 2d and
 * cartoonish"). These tests keep the icon folder, its one import list and its
 * README equal, give every scoring category its icon, and keep emoji from
 * creeping back into the surfaces that were rebuilt.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { CATEGORIES } from '../src/shared/metrics';

const LIST = 'src/components/icons3d/icons3d.ts';
const FOLDER = 'src/assets/icons3d';

const source = readFileSync(LIST, 'utf8');
const files = readdirSync(FOLDER).filter((f) => f.endsWith('.webp')).sort();
const imported = [...source.matchAll(/from '\.\.\/\.\.\/assets\/icons3d\/([a-z-]+\.webp)'/g)].map((m) => m[1]).sort();

/** An emoji drawn as a picture (🔍, 📊) or forced to one by U+FE0F (⚖️). © and ™ are text, so they pass. */
const EMOJI = /\p{Emoji_Presentation}|️/u;

describe('3D icons', () => {
  it('every file in the icon folder is imported exactly once, and every import has its file', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(imported).toEqual(files);
    expect(new Set(imported).size).toBe(imported.length);
  });

  it('the folder README names every file and the CC0 licence', () => {
    const readme = readFileSync(`${FOLDER}/README.md`, 'utf8');
    expect(readme).toContain('CC0');
    for (const file of files) expect(readme).toContain(`| ${file} |`);
  });

  it('every scoring category has a 3D icon', () => {
    const block = source.slice(source.indexOf('export const CATEGORY_ICON_3D'));
    for (const category of CATEGORIES) expect(block).toMatch(new RegExp(`\\b${category.id}: '`));
  });

  it('the rebuilt surfaces carry no emoji', () => {
    for (const file of [
      'src/components/TabNavigation.tsx',
      'src/components/Footer.tsx',
      'src/components/HomeHero.tsx',
      'src/components/Header.tsx',
      'src/components/icons3d/Icon3D.tsx',
    ]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(EMOJI);
    }
  });

  it('the preset tiles name 3D icons, not emoji', () => {
    const presets = readFileSync('src/components/WeightPresets.tsx', 'utf8');
    const icons = [...presets.matchAll(/^ {4}icon: '([^']*)',/gm)].map((m) => m[1]);
    expect(icons.length).toBe(6);
    for (const icon of icons) expect(icon).not.toMatch(EMOJI);
  });
});
