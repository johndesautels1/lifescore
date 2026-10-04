/**
 * LIFE SCORE - the report presenter uses Olivia's face chain, and the chain moves on (anti-drift).
 *
 * John, 4 Oct 2026 ("Same order as chat"; "Fix in both"):
 * - the live presenter uses useOliviaFace, like her chat: HeyGen LiveAvatar,
 *   then Simli, then D-ID, then voice only. Its own HeyGen streaming back-up
 *   (switched off by HeyGen on 1 Nov 2026) and that route are gone.
 * - Simli and D-ID never threw when they could not start, so the chain never
 *   moved from Simli to D-ID. Their connect() now resolves true or false and
 *   useAvatarProvider moves on when Simli returns false.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('the report presenter', () => {
  it("uses Olivia's face chain, not its old HeyGen streaming session", () => {
    const presenter = read('src/components/ReportPresenter.tsx');
    expect(presenter.includes('useOliviaFace({ videoRef, audioRef })')).toBe(true);
    expect(/useLiveAvatar|createHeyGenSession|heygenSpeak|closeHeyGenSession/.test(presenter)).toBe(false);
  });

  it('the HeyGen streaming route and its browser helpers are gone', () => {
    expect(existsSync('api/olivia/avatar/heygen.ts')).toBe(false);
    expect(/\/api\/olivia\/avatar\/heygen['"]/.test(read('src/services/oliviaService.ts'))).toBe(false);
    expect(read('vercel.json').includes('api/olivia/avatar/heygen.ts')).toBe(false);
  });
});

describe("Olivia's back-up faces say whether they started", () => {
  it('Simli and D-ID connect() resolve true or false', () => {
    expect(read('src/hooks/useSimli.ts').includes('const connect = useCallback(async (): Promise<boolean> =>')).toBe(true);
    expect(read('src/hooks/useDIDStream.ts').includes('const connect = useCallback(async (): Promise<boolean> =>')).toBe(true);
  });

  it('a Simli that cannot start hands over to D-ID, and the result reaches the caller', () => {
    const provider = read('src/hooks/useAvatarProvider.ts');
    expect(provider.includes('started = await simli.connect();')).toBe(true);
    expect(provider.includes("if (autoFallback) return triggerFallback('Simli could not start');")).toBe(true);
    expect(provider.includes('connected = await did.connect();')).toBe(true);
    expect(read('src/hooks/useOliviaFace.ts').includes('return backup.connect();')).toBe(true);
  });
});
