/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine
 * (src/core/olivia/voiceRequest.ts). Change both copies together.
 *
 * CLUES™ — OLIVIA'S VOICE, AS ONE PURE REQUEST.
 *
 * ⚖️ JOHN, 2026-09-04: *"make sure you properly wire her eleven labs voice do
 * NOT wire some generic voice."*
 *
 * 🔴 THAT IS THE JUDGE'S BUG, WORD FOR WORD, AND IT IS TWO DAYS OLD. On
 * 2026-09-02 he asked *"The judges voice is NOT our eleven labs cristiano voice
 * … Where did you get that voice."* The honest answer was: nowhere. Nothing
 * chose it — a setting held an id and the vendor spoke whatever it named.
 * So this module has ONE rule above every other:
 *
 *   🛑 THERE IS NO DEFAULT VOICE. `buildOliviaVoiceRequest` refuses to build a
 *      call without a voice id. There is no fallback, no "any English female",
 *      no vendor default. If her id is not configured, she does not speak and
 *      the screen says so — because a stranger's voice reading a customer's
 *      report as Olivia is worse than silence.
 *
 * ── THE CONTRACT, read from ElevenLabs' own reference on 2026-09-04 ─────────
 *   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
 *        ?output_format=pcm_24000     ← a QUERY parameter, never a body field
 *   header  xi-api-key                ← the same header the score uses
 *   body    { text, model_id }
 *   → the audio bytes themselves. Not JSON, not a link.
 *
 * 🛑 THE FORMAT IS NOT A PREFERENCE EITHER. Her avatar runs in LITE mode, and
 * the avatar vendor publishes it plainly: PCM 16-bit, 24,000 Hz, mono —
 * *"deviations cause garbled or silent output with no error message"*. So the
 * sample rate is a constant here, pinned by test, rather than an option a
 * future caller could get wrong quietly.
 *
 * ── ONE VENDOR, ONE SHAPE (no dual architecture; John, 2026-09-04) ──────────
 * This is the same pattern `musicRequest.ts` already uses for ElevenLabs in
 * this repo: a PURE builder holding the contract and the constants, and a thin
 * server module that does the fetch. Two ElevenLabs products (a score, a
 * voice), one way of calling them.
 *
 * PURE. No clock, no network, no key stored.
 */

/** The one host. Shared with the score — same vendor, same base. */
export const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

/** The documented auth header. Not a bearer token. */
export const VOICE_KEY_HEADER = "xi-api-key";

/** The only sample rate her avatar accepts, as a query value. */
export const VOICE_OUTPUT_FORMAT = "pcm_24000";

/** Their current multilingual model — the one London Tech Map runs her on. */
export const VOICE_MODEL_ID = "eleven_multilingual_v2";

/**
 * A single utterance's ceiling. A deck chapter is seconds of speech; anything
 * longer is a defect upstream, and it is cut here rather than paid for.
 */
export const VOICE_MAX_CHARS = 4_000;

/**
 * Her delivery, exactly as the reference wiring sets it.
 *
 * ⚖️ John, 2026-09-04 22:03: *"it is paramount that that wiring is followed."*
 * These four numbers are not taste — they are the settings Olivia has been
 * speaking with in production since 2026-08-09
 * (`D:\London-Tech-Map\src\app\api\olivia\liveavatar\speak\route.ts:104–109`).
 * Sending none, as this module did, means the vendor applies ITS defaults, so
 * she would not sound like herself even with her own voice id.
 */
export const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
} as const;

export interface VoiceRequest {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: {
    readonly text: string;
    readonly model_id: typeof VOICE_MODEL_ID;
    readonly voice_settings: typeof VOICE_SETTINGS;
  };
}

/** Why a request could not be built at all. */
export class NoVoiceConfigured extends Error {
  constructor() {
    super("Olivia's own ElevenLabs voice id is not configured, and there is no default voice.");
    this.name = "NoVoiceConfigured";
  }
}

/**
 * Build the one call.
 *
 * @param text  what she says — already speakable (`speakable()` runs over every
 *   segment in `presenterScript.ts`; the voice layer never re-writes words).
 * @param key   the account key — travels in a header, never in the URL.
 * @param voiceId  HER voice. Required, with no fallback: see the rule above.
 * @throws NoVoiceConfigured when the voice id is missing or blank.
 */
export function buildOliviaVoiceRequest(text: string, key: string, voiceId: string): VoiceRequest {
  const id = voiceId.trim();
  if (id === "") throw new NoVoiceConfigured();
  return {
    url: `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(id)}/stream?output_format=${VOICE_OUTPUT_FORMAT}`,
    headers: { [VOICE_KEY_HEADER]: key, "content-type": "application/json" },
    body: {
      text: text.trim().slice(0, VOICE_MAX_CHARS),
      model_id: VOICE_MODEL_ID,
      voice_settings: VOICE_SETTINGS,
    },
  };
}
