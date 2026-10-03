/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine
 * (server/report/oliviaVoice.ts). Only the import path and the `process`
 * declaration differ. Change both copies together.
 *
 * CLUES™ — OLIVIA'S VOICE, FETCHED. Words in, raw PCM out.
 * ───────────────────────────────────────────────────────────────────────────
 * Her avatar runs in LITE mode: the vendor renders a face and WE supply the
 * sound. This module owns that one step, and it is deliberately thin — the
 * contract, the constants and the refusal to use a stranger's voice all live
 * in the pure builder (`src/core/olivia/voiceRequest.ts`), exactly the way the
 * film's score is split between `musicRequest.ts` and `music.ts`.
 *
 * ⚖️ ONE VENDOR, ONE SHAPE (John, 2026-09-04: *"NO dual architectures"*).
 * ElevenLabs was already called in this repo for the score and the room tone.
 * Nothing new was invented here: same header, same pure-builder pattern, same
 * "never fatal, always a reason" contract.
 *
 * ⚖️ AND HER VOICE IS HERS (John, same day: *"do NOT wire some generic
 * voice"*). If `ELEVENLABS_OLIVIA_VOICE_ID` is unset, this refuses. It never
 * falls back to a vendor default — the judge's own 2026-09-02 defect was
 * exactly that, a setting nobody had chosen speaking as a named person.
 */
import { buildOliviaVoiceRequest, NoVoiceConfigured } from "./oliviaVoiceRequest.js";

const KEY_ENV = "ELEVENLABS_API_KEY";
const VOICE_ENV = "ELEVENLABS_OLIVIA_VOICE_ID";

/** One clip's ceiling. A chapter is seconds of speech, not minutes. */
const TIMEOUT_MS = 30_000;

/**
 * Refuse to buffer an implausible amount of audio. A chapter is well under a
 * minute of PCM; this sits far above that so a misbehaving upstream cannot
 * grow the function's memory without bound.
 */
const MAX_BYTES = 16 * 1024 * 1024;

export type VoiceFailure =
  | "no-key"
  | "no-voice"
  | "unauthorized"
  | "vendor-refused"
  | "vendor-unreachable"
  | "too-large";

export type VoiceResult =
  | { readonly ok: true; readonly audioBase64: string; readonly bytes: number }
  | { readonly ok: false; readonly reason: VoiceFailure; readonly detail: string };

/** True when the key AND her own voice id are both present. */
export function oliviaVoiceConfigured(): boolean {
  return (process.env[KEY_ENV] ?? "").trim() !== "" && (process.env[VOICE_ENV] ?? "").trim() !== "";
}

/**
 * Say one passage in Olivia's voice.
 *
 * @param text  what she should say — already speakable.
 * @param signal  the reader stopped, or left the page. A paid vendor call with
 *   nobody listening is a cost leak, so it is cancelled rather than awaited.
 */
export async function speakAsOlivia(text: string, signal?: AbortSignal): Promise<VoiceResult> {
  const key = (process.env[KEY_ENV] ?? "").trim();
  if (key === "") return { ok: false, reason: "no-key", detail: `${KEY_ENV} is unset` };
  const spoken = text.trim();
  if (spoken === "") return { ok: false, reason: "vendor-refused", detail: "nothing to say" };

  let req;
  try {
    req = buildOliviaVoiceRequest(spoken, key, process.env[VOICE_ENV] ?? "");
  } catch (e) {
    // The one refusal that is OURS, not the vendor's: her voice is not set, so
    // she stays silent rather than borrowing somebody else's.
    if (e instanceof NoVoiceConfigured) return { ok: false, reason: "no-voice", detail: `${VOICE_ENV} is unset` };
    return { ok: false, reason: "vendor-refused", detail: e instanceof Error ? e.message : String(e) };
  }

  let res: Response;
  try {
    res = await fetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, reason: "vendor-unreachable", detail: e instanceof Error ? e.message : String(e) };
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300).trim();
    return {
      ok: false,
      reason: res.status === 401 || res.status === 403 ? "unauthorized" : "vendor-refused",
      detail: `${res.status}: ${detail}`,
    };
  }

  const bytes = await res.arrayBuffer();
  if (bytes.byteLength === 0) return { ok: false, reason: "vendor-refused", detail: "empty audio" };
  if (bytes.byteLength > MAX_BYTES) return { ok: false, reason: "too-large", detail: `${bytes.byteLength} bytes` };
  return { ok: true, audioBase64: toBase64(bytes), bytes: bytes.byteLength };
}

/**
 * Bytes to base64.
 *
 * Chunked because spreading a multi-megabyte array into `String.fromCharCode`
 * blows the call stack — a failure that only appears on a LONG passage, which
 * is exactly the one a short fixture would never catch.
 */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8 * 1024;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return typeof Buffer === "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

/** What the reader is told, per reason. Never the vendor's own words. */
export function oliviaVoiceMessage(reason: VoiceFailure): string {
  switch (reason) {
    case "no-key":
      return "Olivia's voice isn't switched on here yet. Your deck is unaffected.";
    case "no-voice":
      return "Olivia's own voice hasn't been set up yet, and she won't use anybody else's. Your deck is unaffected.";
    case "unauthorized":
      return "Olivia's voice couldn't sign in just now. Please try again shortly.";
    case "too-large":
      return "That chapter came back too long to play. Please try again.";
    case "vendor-unreachable":
      return "Olivia's voice couldn't be reached just now. Please try again shortly.";
    case "vendor-refused":
      return "Olivia couldn't speak that chapter just now. Please try again shortly.";
  }
}
