/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine
 * (src/core/olivia/liteProtocol.ts). Change both copies together.
 *
 * CLUES™ — THE LITE PROTOCOL. Every rule the avatar vendor publishes, in one
 * place, so no surface can get them wrong.
 * ───────────────────────────────────────────────────────────────────────────
 * ⚖️ John, 2026-09-04: *"use the current wiring heygen has our london-tech-map
 * on to wire her up."* This IS that wiring — ported from our own hardened
 * module (London Tech Map, src/lib/integrations/heygen/liveavatar/
 * lite-protocol.ts, in production since 2026-08-09), and re-read against the
 * vendor documentation on 2026-09-04 before it was brought across.
 *
 * ── THE PUBLISHED RULES, WITH SOURCES ────────────────────────────────────────
 * [1] docs.liveavatar.com/docs/lite-mode/events
 *     agent.speak — "Audio must be PCM 16-bit 24 kHz encoded as Base64",
 *     chunk ~1 second, max 1MB per packet; and "Wait for session.state_updated
 *     with state connected before sending any command events."
 * [2] liveavatar-agent-skills / lite-mode-guide.md
 *     • "Sample rate: 24,000 Hz (deviations cause garbled or silent output
 *        with no error message)"; raw PCM, no headers; 16-bit signed little-
 *        endian; mono; base64 when transmitted.
 *     • "Chunk pacing: Initial 600ms buffer, then 1-second chunks thereafter"
 *     • "Stream TTS audio with matching event_id across all chunks" and
 *       "Using different event_id values per chunk breaks playback"
 *     • "Missing agent.speak_end prevents avatar state transitions"
 *     • "Events sent before receiving connected are discarded"
 *     • keep-alive "every 2-3 minutes" against a 5-minute idle timeout
 * [3] LITE uses the agent.* event names; avatar.* is FULL-only.
 * [4] docs.liveavatar.com/docs/core-concepts/voices — "Voices are used in FULL
 *     Mode only. In LITE Mode, you bring your own audio pipeline" — which is
 *     why a LITE session token carries no voice field, and why Olivia's voice
 *     is ours (server/report/oliviaVoice.ts).
 *
 * 🛑 THE FAILURES THESE RULES PREVENT ARE ALL SILENT. A wrong sample rate, a
 * changed event id, a missing speak_end, a command sent before connected —
 * none of them error. She simply stands there, or her mouth runs ahead of her
 * voice. That is why the rules live in one pure module with tests rather than
 * inside a component.
 *
 * PURE and dependency-free: no DOM, no network, no SDK, no clock.
 */

// ─── Audio spec [1][2] ───────────────────────────────────────────────────────

/** 24,000 Hz. A deviation is silent or garbled with NO error from the vendor. */
export const LITE_SAMPLE_RATE_HZ = 24_000;

/** 16-bit signed little-endian, mono → 2 bytes per sample. */
export const LITE_BYTES_PER_SAMPLE = 2;

/** 48,000 bytes of raw PCM per second of speech. */
export const LITE_BYTES_PER_SECOND = LITE_SAMPLE_RATE_HZ * LITE_BYTES_PER_SAMPLE;

/** "Initial 600ms buffer, then 1-second chunks thereafter" [2]. */
export const LITE_FIRST_CHUNK_MS = 600;
export const LITE_CHUNK_MS = 1_000;

/** Max 1MB per packet [1]. Base64 inflates by 4/3, so the cap is on the wire. */
export const LITE_MAX_PACKET_CHARS = 1_000_000;

/** Idle timeout, and the interval that stays inside the vendor's 2-3 min [2]. */
export const LITE_IDLE_TIMEOUT_MS = 300_000;
export const LITE_KEEP_ALIVE_MS = 150_000; // 2.5 minutes

/** Bytes of PCM in a chunk of `ms` milliseconds, rounded to a 3-byte boundary
 *  so frames cut cleanly on base64 groups without decoding the audio. */
function bytesForMs(ms: number): number {
  const raw = Math.floor((LITE_BYTES_PER_SECOND * ms) / 1000);
  return Math.max(3, Math.floor(raw / 3) * 3);
}

// ─── Messages we send [1][3] ─────────────────────────────────────────────────

/** Every command this protocol can send. `agent.*` — never `avatar.*` [3]. */
export type LiteCommand =
  | { readonly type: "agent.speak"; readonly event_id: string; readonly audio: string }
  | { readonly type: "agent.speak_end"; readonly event_id: string }
  | { readonly type: "agent.interrupt" }
  | { readonly type: "agent.start_listening"; readonly event_id: string }
  | { readonly type: "agent.stop_listening"; readonly event_id: string }
  | { readonly type: "session.keep_alive"; readonly event_id: string };

/** One command and the moment, relative to the start of the utterance, that it
 *  is due to be sent. Size alone is not the rule — see {@link sendUtterance}. */
export interface PacedCommand {
  readonly message: LiteCommand;
  readonly sendAtMs: number;
}

/**
 * The ordered messages for ONE utterance: a 600ms opening chunk, 1-second
 * chunks after it, then `agent.speak_end` — every one of them carrying the
 * SAME `event_id`, because differing ids break playback [2] — and each stamped
 * with WHEN it is due, because the vendor's pacing is a rate, not just a size.
 *
 * @param base64Pcm  The whole clip: raw PCM 16-bit 24kHz mono, base64.
 * @param eventId    One id for the whole utterance. Caller supplies it so the
 *   module stays pure and the id is reproducible in tests.
 * @returns The messages to send in order. Empty for an empty clip.
 */
export function planUtterance(
  base64Pcm: string,
  eventId: string,
): PacedCommand[] {
  const clip = base64Pcm.trim();
  if (clip.length === 0) return [];

  const paced: PacedCommand[] = [];
  let at = 0;
  let sendAtMs = 0;
  let first = true;

  while (at < clip.length) {
    const budgetMs = first ? LITE_FIRST_CHUNK_MS : LITE_CHUNK_MS;
    const chars = Math.min((bytesForMs(budgetMs) / 3) * 4, LITE_MAX_PACKET_CHARS);
    const audio = clip.slice(at, at + chars);
    paced.push({
      message: { type: "agent.speak", event_id: eventId, audio },
      sendAtMs,
    });
    at += chars;
    // Advance by the audio ACTUALLY in this chunk, not by the budget. The final
    // chunk of a clip is almost always short, and charging it a full second
    // would schedule speak_end after silence that does not exist — the avatar
    // would hold its mouth open waiting for audio already delivered.
    const bytesInChunk = (audio.length / 4) * 3;
    sendAtMs += Math.round((bytesInChunk / LITE_BYTES_PER_SECOND) * 1000);
    first = false;
  }

  // "Missing agent.speak_end prevents avatar state transitions" [2]. Due once
  // the last chunk's audio has actually been handed over, not before.
  paced.push({ message: { type: "agent.speak_end", event_id: eventId }, sendAtMs });
  return paced;
}

/**
 * Send a planned utterance ON ITS CLOCK.
 *
 * THE CORRECTION THIS ENCODES (self-audit, 2026-08-09): the first fix got chunk
 * SIZE right and left TIMING wrong — every chunk was pushed in a tight loop, so
 * a whole reply arrived in one burst. The vendor's rule is "initial 600ms
 * buffer, then 1-second chunks THEREAFTER" [2]: a rate, not just a size. Audio
 * delivered far faster than it is spoken is exactly the shape of a mouth
 * running ahead of a voice.
 *
 * @param plan  From {@link planUtterance}.
 * @param send  How this surface transmits one command.
 * @param signal  Abandons the rest of the utterance when she is stopped — this
 *   is a paid session, and a cancelled reply must stop costing.
 * @param sleep  Injectable for tests; defaults to a real timer.
 */
export async function sendUtterance(
  plan: readonly PacedCommand[],
  send: (message: LiteCommand) => void,
  signal?: AbortSignal,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((r) => setTimeout(r, ms)),
): Promise<number> {
  // Read through a call, not a property test. `AbortSignal.aborted` is declared
  // readonly, so TypeScript narrows it after the first check and then treats the
  // SECOND check — the one that matters, because it runs after a wait during
  // which the caller may well have pressed stop — as impossible. The narrowing
  // is wrong: the object mutates underneath us. A function call re-reads it
  // every time and states the intent plainly.
  const isAborted = (): boolean => signal?.aborted === true;

  let sent = 0;
  let elapsed = 0;
  for (const step of plan) {
    if (isAborted()) return sent;
    const wait = step.sendAtMs - elapsed;
    if (wait > 0) {
      await sleep(wait);
      elapsed = step.sendAtMs;
    }
    // Checked AGAIN after the wait: cancellation almost always arrives here.
    if (isAborted()) return sent;
    send(step.message);
    sent += 1;
  }
  return sent;
}

/** Stop everything currently scheduled [1]. */
export function interruptCommand(): LiteCommand {
  return { type: "agent.interrupt" };
}

/** Keep the session past the 5-minute idle timeout [2]. */
export function keepAliveCommand(eventId: string): LiteCommand {
  return { type: "session.keep_alive", event_id: eventId };
}

/** Visual listening state [1]. */
export function startListeningCommand(eventId: string): LiteCommand {
  return { type: "agent.start_listening", event_id: eventId };
}
export function stopListeningCommand(eventId: string): LiteCommand {
  return { type: "agent.stop_listening", event_id: eventId };
}

// ─── Events we receive [1] ───────────────────────────────────────────────────

/** The session states the vendor reports. */
export type LiteSessionState = "connected" | "connecting" | "closed" | "closing";

/**
 * True only for `{"type":"session.state_updated","state":"connected"}`.
 *
 * This gate is load-bearing: "Events sent before receiving 'connected' are
 * discarded" [2] — silently, with no error. A surface that sends on socket-open
 * instead of on this event can lose an entire reply and show no fault at all.
 */
export function isConnectedEvent(message: unknown): boolean {
  if (typeof message !== "object" || message === null) return false;
  const m = message as { type?: unknown; state?: unknown };
  return m.type === "session.state_updated" && m.state === "connected";
}

/** True when the vendor reports the session has gone away. */
export function isClosedEvent(message: unknown): boolean {
  if (typeof message !== "object" || message === null) return false;
  const m = message as { type?: unknown; state?: unknown };
  return (
    m.type === "session.state_updated" &&
    (m.state === "closed" || m.state === "closing")
  );
}

/** True for `agent.speak_started` — the avatar has begun this utterance. */
export function isSpeakStartedEvent(message: unknown): boolean {
  return readType(message) === "agent.speak_started";
}

/** True for `agent.speak_ended` — "follows every speak_started event" [1]. */
export function isSpeakEndedEvent(message: unknown): boolean {
  return readType(message) === "agent.speak_ended";
}

/** The `type` of a parsed vendor event, or undefined when it is not an event.
 *  Every event predicate goes through this so no surface has to match the
 *  vendor's strings itself — the choke-point gate forbids it elsewhere. */
function readType(message: unknown): string | undefined {
  if (typeof message !== "object" || message === null) return undefined;
  const t = (message as { type?: unknown }).type;
  return typeof t === "string" ? t : undefined;
}

/** A monotonic id for one utterance or command. Callers pass a seed so the
 *  module stays pure — no Date.now() inside, which would break tests and SSR. */
export function utteranceId(seed: number): string {
  return `la_${seed.toString(36)}`;
}
