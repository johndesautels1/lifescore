/**
 * LIFE SCORE - every sign-in method the app keeps is one a screen offers (anti-drift).
 *
 * John, 4 Oct 2026 ("Remove unused code"): AuthContext had an email sign-in
 * link (signInWithMagicLink / signInWithOtp) that no screen offered. It is
 * gone; the sign-in screen offers email and password, Google and GitHub.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('sign-in methods', () => {
  const auth = readFileSync('src/contexts/AuthContext.tsx', 'utf8');
  const login = readFileSync('src/components/LoginScreen.tsx', 'utf8');

  it('the email-link sign-in is gone', () => {
    expect(auth.includes('signInWithOtp')).toBe(false);
    expect(auth.includes('signInWithMagicLink')).toBe(false);
  });

  it('every sign-in method AuthContext provides is used by the sign-in screen', () => {
    for (const method of ['signInWithEmail', 'signInWithGoogle', 'signInWithGitHub']) {
      expect({ method, provided: auth.includes(`const ${method} = useCallback`) }).toEqual({ method, provided: true });
      expect({ method, used: login.includes(`await ${method}(`) }).toEqual({ method, used: true });
    }
  });
});
