/**
 * LIFE SCORE — Olivia's live face: the HeyGen LiveAvatar LITE session.
 *
 * PORTED VERBATIM 2026-10-03 from the questionnaire engine
 * (D:\clues-questionnaire-engine\server\report\liveAvatar.ts) on John's order:
 * "olivia liveavatar wired in bite identical to the heygen configuration
 * clues-questionnaire-engine uses". Only this header and the `process`
 * declaration differ; change both copies together.
 *
 * ── The engine's own notes follow ──
 *
 * CLUES™ — OLIVIA'S FACE. The LiveAvatar LITE session, and nothing else.
 * ───────────────────────────────────────────────────────────────────────────
 * ⚖️ John, 2026-09-04: *"use the current wiring heygen has our london-tech-map
 * on to wire her up."* This is that wiring, re-read against the vendor's live
 * documentation on 2026-09-04 before a line of it was written here:
 *
 *   • base `https://api.liveavatar.com`, auth header `X-API-KEY`
 *   • `POST /v1/sessions/token`  → { code, data: { session_id, session_token } }
 *   • `POST /v1/sessions/start`  → the LiveKit room to join (Bearer the token)
 *   • `POST /v1/sessions/keep-alive` and `/v1/sessions/stop`
 *   • LITE carries NO voice field — in LITE mode we bring the audio and the
 *     vendor only renders the face (docs.liveavatar.com, core-concepts/voices).
 *
 * 🔴 THIS IS NOT THE JUDGE'S PRODUCT, AND THE TWO MUST NEVER MERGE. The judge
 * hands over a script and gets a finished film back (`heygenVideo.ts`, and the
 * test beside it forbids a single word of this file from appearing there).
 * Olivia STREAMS: she is a face in a room, speaking audio we generate, and she
 * can be interrupted. Same vendor, two products, two failure modes.
 *
 * 🛑 THE KEY NEVER LEAVES THE SERVER. The browser is handed a LiveKit room and
 * a client token that expire; it never sees `LIVEAVATAR_API_KEY`.
 *
 * 🛑 NEVER FATAL. Every failure is a typed reason a caller switches on. A
 * presenter that cannot start must not take down the Presentation page — the
 * deck is already made and already paid for.
 */

const API_BASE = "https://api.liveavatar.com";

/** One vendor call's ceiling. A stalled session start must not hold a
 *  serverless invocation open to the platform's own limit. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Why a session could not be had. The screen says a sentence per reason. */
export type LiveAvatarFailure =
  | "not-configured"
  | "unauthorized"
  | "no-credits"
  | "vendor-refused"
  | "vendor-unreachable"
  | "no-room";

export interface LiveAvatarSession {
  readonly sessionId: string;
  /** Bearer used to START the session. It is never handed to a browser and
   *  never needed again: keep-alive and stop are authorized by our api key. */
  readonly sessionToken: string;
  /** The room the browser joins, and the token that lets it in. */
  readonly livekitUrl: string;
  readonly livekitToken: string;
  /** The socket her audio is pushed down. LITE renders the face from OUR
   *  audio, so without this she connects and sits there in silence — the
   *  exact defect London Tech Map hit on 2026-08-09. */
  readonly wsUrl: string;
}

export type LiveAvatarResult =
  | { readonly ok: true; readonly session: LiveAvatarSession }
  | { readonly ok: false; readonly reason: LiveAvatarFailure; readonly detail: string };

/** Olivia's own look, and the key that opens the vendor. Null when unset. */
export function liveAvatarConfig(): { apiKey: string; avatarId: string } | null {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const avatarId = process.env.LIVEAVATAR_OLIVIA_AVATAR_ID;
  if (!apiKey || !avatarId) return null;
  return { apiKey, avatarId };
}

interface VendorReply {
  readonly status: number;
  readonly json: Record<string, unknown> | null;
  readonly text: string;
}

/**
 * ONE request builder, so a header or a timeout can never be right on one call
 * and wrong on another. Never throws: a transport failure is a status of 0.
 */
async function vendorCall(
  path: string,
  init: { method: "POST" | "GET"; apiKey?: string; bearer?: string; body?: unknown; signal?: AbortSignal },
): Promise<VendorReply> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.bearer !== undefined) headers.authorization = `Bearer ${init.bearer}`;
  else if (init.apiKey !== undefined) headers["X-API-KEY"] = init.apiKey;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: abortAfter(REQUEST_TIMEOUT_MS, init.signal),
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = text === "" ? null : JSON.parse(text);
      json = parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text };
  } catch (err) {
    return { status: 0, json: null, text: err instanceof Error ? err.message : "unreachable" };
  }
}

/** Our ceiling, plus the caller's cancellation when there is one. */
function abortAfter(timeoutMs: number, caller?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (caller === undefined) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([timeout, caller]);
  const controller = new AbortController();
  const stop = () => controller.abort();
  timeout.addEventListener("abort", stop, { once: true });
  caller.addEventListener("abort", stop, { once: true });
  return controller.signal;
}

/**
 * The vendor's success codes.
 *
 * 🔴 BOTH, AND THIS COST LONDON TECH MAP A PRODUCTION OUTAGE. Their envelope was
 * historically `code: 100`; the current API answers `code: 1000` with identical
 * success semantics. Measured live in their Vercel log on 2026-08-08: a check
 * for 100 alone threw *"LiveAvatar error (code 1000): Session token created
 * successfully"* and 500'd every session, while the sibling client that accepted
 * both worked. Anything else is a real refusal.
 * (`D:\London-Tech-Map\src\lib\integrations\heygen\liveavatar\client.ts:124`)
 */
const VENDOR_OK_CODES = new Set([100, 1000]);

/** True when the envelope carries a code that is NOT one of the success codes. */
function envelopeRefused(reply: VendorReply): boolean {
  const code = reply.json?.code;
  return typeof code === "number" && !VENDOR_OK_CODES.has(code);
}

/**
 * The payload, whichever shape it arrived in.
 *
 * 🔴 TOLERANT ON PURPOSE (G1-033). The session-START reply has been observed
 * BOTH wrapped in `data` AND flat at the top level, and the two clients London
 * Tech Map consolidated disagreed about which — the one reading `data` only was
 * the one that broke. Reading `data ?? the body itself` is what survives both.
 * (`client.ts:132`.) Ours read `data` only, so a flat reply produced three null
 * fields and the honest-but-wrong answer "no room came back".
 */
function dataOf(reply: VendorReply): Record<string, unknown> | null {
  const data = reply.json?.data;
  if (data !== null && typeof data === "object") return data as Record<string, unknown>;
  return reply.json;
}

function str(record: Record<string, unknown> | null, key: string): string | null {
  const v = record?.[key];
  return typeof v === "string" && v !== "" ? v : null;
}

/** A refusal read as one of our reasons. */
function reasonFor(reply: VendorReply): LiveAvatarFailure {
  if (reply.status === 0) return "vendor-unreachable";
  if (reply.status === 401 || reply.status === 403) return "unauthorized";
  if (reply.status === 402 || /credit/i.test(reply.text)) return "no-credits";
  return "vendor-refused";
}

/**
 * THE LITE SESSION-TOKEN BODY, built in ONE place. Pure, and exported so a test
 * can hold every field still.
 *
 * ⚖️ John, 2026-09-04 22:03: *"it is paramount that that wiring is followed it
 * is complex and any short cuts will cause it not to work."*
 *
 * 🔴 THE SHORTCUT THAT BROKE IT. This request used to send `{ avatar_id }` and
 * nothing else — no `mode`, so the vendor was never asked for a LITE session at
 * all, which is the entire product Olivia runs on. Every other field below is
 * load-bearing too, and each one is copied from the wiring that is in
 * production in London Tech Map
 * (`src/lib/integrations/heygen/liveavatar/client.ts:169–196`), not recalled:
 *
 *   • `mode: "LITE"` — we supply the audio; the vendor renders only the face.
 *   • `quality: "high"` — **and it stays `high`.** The four-tier table
 *     (`very_high | high | medium | low`) is the FULL-mode schema. LITE's own
 *     configuration page allows exactly one value. Raising it to `very_high`
 *     made the vendor reject the session and took Olivia off every surface at
 *     once — John, 2026-08-09: *"The avatar service rejected our credentials …
 *     u crashed olivia."* Do not raise it without a green sandbox probe.
 *   • `encoding: "H264"` — the vendor deprecated VP8 (changelog 2026-07-22).
 *   • `max_session_duration` — the vendor's own ceiling on a paid session.
 *
 * 🛑 NO VOICE FIELD, DELIBERATELY. *"Voices are used in FULL Mode only. In LITE
 * Mode, you bring your own audio pipeline"* (docs.liveavatar.com, core-concepts/
 * voices). The vendor ACCEPTS a voice field here and silently ignores it, so
 * adding one looks like a fix and is worse than useless. Her voice is ours
 * (`oliviaVoice.ts`), sent as audio.
 */
export function buildSessionTokenBody(avatarId: string): Record<string, unknown> {
  return {
    avatar_id: avatarId,
    mode: "LITE",
    is_sandbox: false,
    video_settings: { quality: "high", encoding: "H264" },
    max_session_duration: 600,
  };
}

/**
 * Start a session Olivia can speak through: mint a token, start it, and hand
 * back the room the browser joins.
 */
export async function startOliviaSession(signal?: AbortSignal): Promise<LiveAvatarResult> {
  const config = liveAvatarConfig();
  if (config === null) {
    return { ok: false, reason: "not-configured", detail: "LIVEAVATAR_API_KEY or LIVEAVATAR_OLIVIA_AVATAR_ID is unset" };
  }

  const tokenReply = await vendorCall("/v1/sessions/token", {
    method: "POST",
    apiKey: config.apiKey,
    body: buildSessionTokenBody(config.avatarId),
    signal,
  });
  const tokenData = dataOf(tokenReply);
  const sessionToken = str(tokenData, "session_token");
  const tokenSessionId = str(tokenData, "session_id");
  if (
    tokenReply.status < 200 ||
    tokenReply.status >= 300 ||
    envelopeRefused(tokenReply) ||
    sessionToken === null
  ) {
    console.warn(`[liveavatar] token refused — HTTP ${tokenReply.status}: ${tokenReply.text.slice(0, 300)}`);
    return { ok: false, reason: reasonFor(tokenReply), detail: `token ${tokenReply.status}: ${tokenReply.text.slice(0, 300)}` };
  }
  console.log(`[liveavatar] LITE session token created — session_id: ${tokenSessionId ?? "(none)"}`);

  const startReply = await vendorCall("/v1/sessions/start", {
    method: "POST",
    bearer: sessionToken,
    signal,
  });
  const startData = dataOf(startReply);
  const livekitUrl = str(startData, "livekit_url");
  const livekitToken = str(startData, "livekit_client_token");
  const wsUrl = str(startData, "ws_url");
  if (startReply.status < 200 || startReply.status >= 300 || envelopeRefused(startReply)) {
    console.warn(`[liveavatar] start refused — HTTP ${startReply.status}: ${startReply.text.slice(0, 300)}`);
    return { ok: false, reason: reasonFor(startReply), detail: `start ${startReply.status}: ${startReply.text.slice(0, 300)}` };
  }
  console.log(
    `[liveavatar] session started — livekit_url: ${livekitUrl !== null}, ` +
      `livekit_client_token: ${livekitToken !== null}, ws_url: ${wsUrl !== null}`,
  );
  if (livekitUrl === null || livekitToken === null || wsUrl === null) {
    // A 200 with no room is the vendor changing shape under us. Say exactly
    // that rather than letting the browser fail on an undefined URL.
    return {
      ok: false,
      reason: "no-room",
      detail: `start returned no ${livekitUrl === null ? "livekit_url" : livekitToken === null ? "livekit_client_token" : "ws_url"}`,
    };
  }

  /**
   * 🛑 NEVER OPEN A SESSION WE CANNOT CLOSE (John, 2026-09-04 22:21: *"i dont
   * want to chew up my heygen bill"*).
   *
   * Stop and keep-alive both name the session by id. With no id we would have a
   * live, per-minute session running at the vendor and no way to end it — it
   * would bill until their own idle timeout, every time. An unnamed session is
   * treated as no session at all: nothing is handed to the browser, so nothing
   * is ever left running.
   */
  const sessionId = str(startData, "session_id") ?? tokenSessionId;
  if (sessionId === null) {
    console.error("[liveavatar] start returned no session_id — refusing a session that could not be stopped");
    return { ok: false, reason: "no-room", detail: "start returned no session_id" };
  }

  return {
    ok: true,
    session: {
      sessionId,
      sessionToken,
      livekitUrl,
      livekitToken,
      wsUrl,
    },
  };
}

/**
 * Tell the vendor the session is still wanted.
 *
 * The published idle timeout is five minutes; a caller should tick well inside
 * it. Returns whether the vendor accepted, and never throws.
 *
 * 🛑 KEYED BY SESSION ID, NOT BY THE SESSION TOKEN. Both this and stop are
 * authorized by OUR api key, so the browser never has to hold a vendor
 * credential to keep her alive or shut her down — it names the session and
 * our server proves who it is.
 */
export async function keepOliviaSessionAlive(sessionId: string, signal?: AbortSignal): Promise<boolean> {
  const config = liveAvatarConfig();
  if (config === null) return false;
  const reply = await vendorCall("/v1/sessions/keep-alive", {
    method: "POST",
    apiKey: config.apiKey,
    body: { session_id: sessionId },
    signal,
  });
  return reply.status >= 200 && reply.status < 300;
}

/**
 * End the session.
 *
 * 🛑 THIS IS A COST BRAKE, NOT A COURTESY. A live session bills while it is
 * open, so a reader who closes the tab must not leave Olivia standing in an
 * empty room. Called on stop, on unmount, and on the page being hidden.
 */
export async function stopOliviaSession(sessionId: string, signal?: AbortSignal): Promise<boolean> {
  const config = liveAvatarConfig();
  if (config === null) return false;
  const reply = await vendorCall("/v1/sessions/stop", {
    method: "POST",
    apiKey: config.apiKey,
    body: { session_id: sessionId, reason: "USER_CLOSED" },
    signal,
  });
  return reply.status >= 200 && reply.status < 300;
}

/** What the reader is told, per reason. Never the vendor's own words. */
export function liveAvatarMessage(reason: LiveAvatarFailure): string {
  switch (reason) {
    case "not-configured":
      return "Olivia's presenter isn't switched on yet. Your deck is unaffected.";
    case "unauthorized":
      return "Olivia couldn't sign in to her presenter just now. Please try again shortly.";
    case "no-credits":
      return "Olivia's presenter is out of time for the moment. Your deck is unaffected.";
    case "no-room":
      return "Olivia connected but no room came back. Please try again.";
    case "vendor-unreachable":
      return "Olivia couldn't be reached just now. Please try again shortly.";
    case "vendor-refused":
      return "Olivia couldn't start her presentation just now. Please try again shortly.";
  }
}
