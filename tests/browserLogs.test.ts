/**
 * LIFE SCORE - the browser console never shows who is signed in (anti-drift).
 *
 * The February bug audit marked A34 ("console.log in auth flow") fixed, but on
 * 4 Oct 2026 the console still printed "[Auth] Fetching profile for user: <id>"
 * and "[Auth] Profile loaded: <email>" (John's own console). Anyone at the
 * screen, or any browser extension, could read them. No console call in src/
 * may print an email address or a user id.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every .ts / .tsx file under a folder. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/** A console call whose arguments carry an email, a user id, or a whole profile, user or session object. */
const LEAK =
  /console\.(log|info|warn|debug|error)\(.*(\.email\b|\buserId\b|\buser\.id\b|\buser_id\b|\bprofile\.id\b|[{,]\s*(profile|user|session)\s*[},)])/;

describe('browser console', () => {
  it('no console call in src/ prints an email or a user id', () => {
    const leaks: string[] = [];
    for (const file of sourceFiles('src')) {
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (LEAK.test(line)) leaks.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(leaks).toEqual([]);
  });
});
