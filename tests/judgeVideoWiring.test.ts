/**
 * LIFE SCORE - Cristiano's judge video: the engine's judge-page HeyGen wiring.
 *
 * api/shared/heygen/heygenVideo.ts is a verbatim copy of the questionnaire
 * engine's module. These checks pin the parts that broke another repo for three
 * months when they drifted (a v2-shaped body sent to the v3 URL) and the status
 * rule that once showed a finished film as "still rendering".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildVideoRequest, parseStatusReply, parseSubmitReply, videoConfigured } from '../api/shared/heygen/heygenVideo';
import { deriveVideoStatus, normaliseStatus } from '../api/shared/heygen/videoStatus';

describe('HeyGen judge video request (v3, avatar IV)', () => {
  it('is the flat v3 avatar body with the engine\'s settings', () => {
    const body = buildVideoRequest({ script: 'The verdict.', avatarId: 'look_1', voiceId: 'voice_1' });
    expect(body).toMatchObject({
      type: 'avatar',
      avatar_id: 'look_1',
      voice_id: 'voice_1',
      script: 'The verdict.',
      engine: { type: 'avatar_iv' },
      aspect_ratio: '16:9',
      fit: 'contain',
      resolution: '1080p',
    });
    expect(body).not.toHaveProperty('video_inputs');
    expect(body).not.toHaveProperty('dimension');
  });

  it('reads the same three settings the engine reads', () => {
    expect(videoConfigured({ env: { HEYGEN_API_KEY: 'k', HEYGEN_AVATAR_LOOK_ID: 'l', HEYGEN_CRISTIANO_VOICE_ID: 'v' } })).toBe(true);
    expect(videoConfigured({ env: { HEYGEN_API_KEY: 'k', HEYGEN_AVATAR_LOOK_ID: 'l' } })).toBe(false);
  });
});

describe('HeyGen replies', () => {
  it('a submit reply yields the video id', () => {
    expect(parseSubmitReply({ data: { video_id: 'vid_9' } })).toEqual({ videoId: 'vid_9' });
    expect(parseSubmitReply({ data: {} })).toBeNull();
  });

  it('a video URL means completed even with no status word; a failure outranks it', () => {
    expect(parseStatusReply({ data: { video_url: 'https://x/v.mp4', duration: 61 } })).toMatchObject({ status: 'completed', videoUrl: 'https://x/v.mp4', seconds: 61 });
    expect(deriveVideoStatus({ videoUrl: 'https://x/v.mp4', failureMessage: 'broken' })).toBe('failed');
    expect(normaliseStatus('mystery-word')).toBe('processing');
  });
});

describe('primary and back-up', () => {
  it('the judge video route tries HeyGen before the Replicate lip-sync', () => {
    const route = readFileSync('api/avatar/generate-judge-video.ts', 'utf8');
    const heygen = route.indexOf('await submitVideo(');
    const replicate = route.indexOf('/predictions');
    expect(heygen).toBeGreaterThan(0);
    expect(replicate).toBeGreaterThan(heygen);
  });

  it("Olivia's recorded video tries HeyGen v3 before the v2 back-up, and only with her own look", () => {
    const route = readFileSync('api/olivia/avatar/heygen-video.ts', 'utf8');
    const v3 = route.indexOf('await submitOnV3(');
    const v2 = route.indexOf('await generateVideo(apiKey');
    expect(v3).toBeGreaterThan(0);
    expect(v2).toBeGreaterThan(v3);
    // The look check runs before any v3 submission, so the shared wiring's
    // self-repair can never put another presenter's face on her words.
    expect(route.indexOf('looks.some((look) => look.id === avatarId)')).toBeGreaterThan(0);
    expect(route.indexOf('looks.some((look) => look.id === avatarId)')).toBeLessThan(route.indexOf('await submitVideo('));
  });
});
