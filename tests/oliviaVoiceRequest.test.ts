/**
 * LIFE SCORE — the questionnaire engine's own test for this ported module
 * (src/core/olivia/__tests__/voiceRequest.test.ts), copied verbatim with only the import path changed. It fails if the
 * copied wiring is edited on one side only.
 */
/**
 * ⚖️ JOHN, 2026-09-04: *"make sure you properly wire her eleven labs voice do
 *    NOT wire some generic voice."*
 *
 * 🔴 THE DEFECT THIS PREVENTS IS TWO DAYS OLD AND WAS HIS OWN FINDING. The
 *    judge spoke in a voice nobody had chosen, because the code sent whatever
 *    a setting held and the vendor obliged. These tests make the equivalent
 *    impossible for Olivia: no voice id, no call — and no default, ever.
 *
 * The rest pins the contract read from ElevenLabs' reference on 2026-09-04, so
 * a future edit that moves `output_format` into the body, or swaps the auth
 * header for a bearer token, fails here instead of in production silence.
 */
import { describe, it, expect } from "vitest";
import {
  buildOliviaVoiceRequest,
  NoVoiceConfigured,
  VOICE_KEY_HEADER,
  VOICE_MAX_CHARS,
  VOICE_MODEL_ID,
  VOICE_OUTPUT_FORMAT,
} from "../api/shared/oliviaVoiceRequest";

const KEY = "sk-test";
const HER_VOICE = "olivia-voice-id";

describe("🛑 her voice or no voice", () => {
  it("refuses to build a call with no voice id — there is no default", () => {
    expect(() => buildOliviaVoiceRequest("hello", KEY, "")).toThrow(NoVoiceConfigured);
    expect(() => buildOliviaVoiceRequest("hello", KEY, "   ")).toThrow(NoVoiceConfigured);
  });

  it("puts HER id in the path, trimmed and escaped", () => {
    const req = buildOliviaVoiceRequest("hello", KEY, `  ${HER_VOICE}  `);
    expect(req.url).toContain(`/text-to-speech/${HER_VOICE}/stream`);
  });
});

describe("the contract, as the vendor documents it", () => {
  const req = buildOliviaVoiceRequest("Welcome to your CLUES report.", KEY, HER_VOICE);

  it("output_format is a QUERY parameter, never a body field", () => {
    expect(req.url).toContain(`?output_format=${VOICE_OUTPUT_FORMAT}`);
    expect(JSON.stringify(req.body)).not.toContain("output_format");
  });

  it("the sample rate is the one her avatar accepts — a deviation is silent, not an error", () => {
    expect(VOICE_OUTPUT_FORMAT).toBe("pcm_24000");
  });

  it("authorizes with the documented key header, not a bearer token", () => {
    expect(req.headers[VOICE_KEY_HEADER]).toBe(KEY);
    expect(VOICE_KEY_HEADER).toBe("xi-api-key");
    expect(req.headers.authorization).toBeUndefined();
  });

  /**
   * 🔴 CORRECTED 2026-09-04 by the line-by-line audit John ordered against the
   * reference wiring. This used to assert "the words and the model, and nothing
   * else" — and "nothing else" was the bug. With no `voice_settings` the vendor
   * applies its own defaults, so Olivia would not sound like herself even when
   * speaking through her own voice id. These four values are the ones she has
   * been speaking with in production since 2026-08-09
   * (`D:\London-Tech-Map\src\app\api\olivia\liveavatar\speak\route.ts:104`).
   */
  it("sends the words, the model, and her own delivery", () => {
    expect(req.body).toEqual({
      text: "Welcome to your CLUES report.",
      model_id: VOICE_MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    });
  });

  it("the key never travels in the URL", () => {
    expect(req.url).not.toContain(KEY);
  });
});

describe("a long chapter cannot run away with the bill", () => {
  it("caps one utterance at the documented ceiling", () => {
    const req = buildOliviaVoiceRequest("a".repeat(VOICE_MAX_CHARS + 500), KEY, HER_VOICE);
    expect(req.body.text).toHaveLength(VOICE_MAX_CHARS);
  });

  it("trims what it is given rather than speaking whitespace", () => {
    expect(buildOliviaVoiceRequest("  hello  ", KEY, HER_VOICE).body.text).toBe("hello");
  });
});
