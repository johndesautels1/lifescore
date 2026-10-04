/**
 * LIFE SCORE - one connection per outside service (anti-drift).
 *
 * The house rule (Technical Support Manual, section 1): each outside vendor has
 * one client file in api/shared/; routes call it, never the vendor's address.
 * This holds every vendor already there to its file. HeyGen, D-ID and Replicate
 * are still called from several routes (code tidy-up, 4 Oct 2026: listed here,
 * to be folded into one client each); a new route calling them is still caught.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path.replace(/\\/g, '/')] : [];
  });
}

const code = [...files('api'), ...files('src')].map((file) => ({ file, text: readFileSync(file, 'utf8') }));
const callers = (host: string) => code.filter(({ text }) => text.includes(host)).map(({ file }) => file).sort();

/** host -> the only files allowed to name it */
const ONE_CLIENT: Record<string, string[]> = {
  'api.resend.com': ['api/shared/resend.ts'],
  'api.anthropic.com': ['api/shared/anthropic.ts'],
  'api.openai.com': ['api/shared/openai.ts'],
  'generativelanguage.googleapis.com': ['api/shared/gemini.ts'],
  'api.x.ai': ['api/shared/xai.ts'],
  'api.perplexity.ai': ['api/shared/perplexity.ts'],
  'api.tavily.com': ['api/shared/tavily.ts'],
  'public-api.gamma.app': ['api/gamma.ts'],
  'fal.run': ['api/shared/falKling.ts'],
  'api.elevenlabs.io': ['api/shared/elevenlabs.ts', 'api/shared/oliviaVoiceRequest.ts'],
};

/** Still in several routes (to be folded into one client each); no new file may join them. */
const NOT_YET_ONE_CLIENT: Record<string, string[]> = {
  'api.heygen.com': [
    'api/cristiano/render.ts',
    'api/olivia/avatar/heygen-video.ts',
    'api/shared/heygen/heygenVideo.ts',
    'api/shared/heygen/videoAgentRequest.ts',
  ],
  'api.d-id.com': ['api/judge-video.ts', 'api/olivia/avatar/did.ts', 'api/olivia/avatar/streams.ts'],
  'api.replicate.com': [
    'api/avatar/generate-judge-video.ts',
    'api/avatar/video-status.ts',
    'api/olivia/contrast-images.ts',
    'api/shared/replicateWebhook.ts',
    'api/video/grok-generate.ts',
    'api/video/grok-status.ts',
  ],
};

describe('one connection per outside service', () => {
  it('each service with one client is called only from it', () => {
    const wrong = Object.entries(ONE_CLIENT)
      .filter(([host, allowed]) => JSON.stringify(callers(host)) !== JSON.stringify([...allowed].sort()))
      .map(([host]) => `${host}: ${callers(host).join(', ')}`);
    expect(wrong).toEqual([]);
  });

  it('the services not yet in one client gain no new caller', () => {
    const extra = Object.entries(NOT_YET_ONE_CLIENT).flatMap(([host, known]) =>
      callers(host).filter((file) => !known.includes(file)).map((file) => `${host}: ${file}`)
    );
    expect(extra).toEqual([]);
  });
});
