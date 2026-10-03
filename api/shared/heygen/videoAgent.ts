/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine
 * (server/report/videoAgent.ts), the HeyGen wiring Cristiano's films use there. Only the import path differs. Change both
 * copies together.
 *
 * ── The engine's own notes follow ──
 *
 * CLUES™ — HEYGEN VIDEO AGENT, THE CLIENT.
 *
 * ⚖️ JOHN, 2026-09-01, after putting the scene book into HeyGen by hand and
 * getting a real film back: *"make it so that we might throw the entire prompt
 * at hey gen via the api and have it return a plug and play video into our
 * display screen."*
 *
 * 🛑 IT NEVER THROWS ACROSS THIS BOUNDARY. Every path returns a typed result, so
 * a route can put the vendor's own words on the row and in front of a reader
 * rather than a stack trace.
 *
 * 🛑 EVERY CALL CARRIES A TIMEOUT AND THE CALLER'S SIGNAL. A film that is
 * abandoned must not leave a request running against somebody's bill.
 */
import {
  agentHeaders,
  buildVideoAgentRequest,
  parseAgentSession,
  parseAgentSubmit,
  parseAgentVideo,
  sessionUrl,
  videoUrl,
} from "./videoAgentRequest.js";
import type { AgentVideoState, VideoAgentAsk } from "./videoAgentRequest.js";

/** The same key the presenter uses. One vendor, one credential. */
const ENV_KEY = "HEYGEN_API_KEY";

const SUBMIT_TIMEOUT_MS = 60_000;
const POLL_TIMEOUT_MS = 20_000;

/** True when this environment can reach the agent at all. */
export function videoAgentConfigured(): boolean {
  return (process.env[ENV_KEY] ?? "").trim() !== "";
}

function key(): string | null {
  const k = (process.env[ENV_KEY] ?? "").trim();
  return k === "" ? null : k;
}

/** Why a call could not be completed, in words a reader can act on. */
export interface AgentFailure {
  readonly kind: "not_configured" | "refused" | "unreadable" | "unreachable" | "timeout";
  readonly status?: number;
  readonly message: string;
}

export type AgentResult<T> = { ok: true; value: T } | { ok: false; failure: AgentFailure };

/** Our timeout, composed with the caller's own cancellation. */
function composed(caller: AbortSignal | undefined, ms: number): AbortSignal {
  const own = AbortSignal.timeout(ms);
  return caller ? AbortSignal.any([caller, own]) : own;
}

/** The first 400 characters of a refusal — enough to act on, never a wall. */
async function briefly(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text.slice(0, 400).trim();
}

function reasonFor(e: unknown, doing: string): AgentFailure {
  const name = e instanceof Error ? e.name : "";
  const raw = e instanceof Error ? e.message : String(e);
  if (name === "AbortError" || name === "TimeoutError" || /abort|timeout/i.test(raw)) {
    return { kind: "timeout", message: `HeyGen did not answer while ${doing}.` };
  }
  return { kind: "unreachable", message: `HeyGen could not be reached while ${doing}: ${raw}` };
}

/**
 * Hand the whole brief to the agent.
 *
 * @param ask the composed prompt, and our own presenter when we have one
 * @returns the session to poll, and the video id when it is already assigned
 */
export async function startAgentFilm(
  ask: VideoAgentAsk,
  signal?: AbortSignal,
): Promise<AgentResult<{ sessionId: string; videoId: string | null }>> {
  const k = key();
  if (k === null) {
    return { ok: false, failure: { kind: "not_configured", message: "The film agent is not set up yet." } };
  }
  let req;
  try {
    req = buildVideoAgentRequest(ask);
  } catch (e) {
    // A brief that is empty or over the vendor's cap is OUR defect, caught
    // before a call is made rather than after it is charged for.
    return { ok: false, failure: { kind: "refused", message: e instanceof Error ? e.message : String(e) } };
  }
  try {
    const res = await fetch(req.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...agentHeaders(k) },
      body: JSON.stringify(req.body),
      signal: composed(signal, SUBMIT_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        ok: false,
        failure: {
          kind: "refused",
          status: res.status,
          message: `HeyGen refused the film (HTTP ${res.status}). ${await briefly(res)}`.trim(),
        },
      };
    }
    const parsed = parseAgentSubmit(await res.json().catch(() => null));
    if (parsed === null) {
      return { ok: false, failure: { kind: "unreadable", message: "HeyGen took the brief but named no session." } };
    }
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, failure: reasonFor(e, "handing over the brief") };
  }
}

/**
 * Ask the session whether it has produced a film yet.
 *
 * 🛑 THIS IS STEP ONE OF TWO. The agent plans before it renders, and only then
 * names a video. Polling the video before it exists is how a caller decides a
 * film failed when it is going perfectly well.
 */
export async function agentSession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<AgentResult<{ status: string; videoId: string | null; error: string | null }>> {
  const k = key();
  if (k === null) {
    return { ok: false, failure: { kind: "not_configured", message: "The film agent is not set up yet." } };
  }
  try {
    const res = await fetch(sessionUrl(sessionId), {
      method: "GET",
      headers: agentHeaders(k),
      signal: composed(signal, POLL_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        ok: false,
        failure: {
          kind: "refused",
          status: res.status,
          message: `HeyGen would not report on the film (HTTP ${res.status}). ${await briefly(res)}`.trim(),
        },
      };
    }
    const parsed = parseAgentSession(await res.json().catch(() => null));
    if (parsed === null) {
      return { ok: false, failure: { kind: "unreadable", message: "HeyGen's answer carried no film to report on." } };
    }
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, failure: reasonFor(e, "asking how the film is going") };
  }
}

/** Ask the finished film for its file. Step two of two. */
export async function agentVideo(
  videoId: string,
  signal?: AbortSignal,
): Promise<AgentResult<AgentVideoState>> {
  const k = key();
  if (k === null) {
    return { ok: false, failure: { kind: "not_configured", message: "The film agent is not set up yet." } };
  }
  try {
    const res = await fetch(videoUrl(videoId), {
      method: "GET",
      headers: agentHeaders(k),
      signal: composed(signal, POLL_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        ok: false,
        failure: {
          kind: "refused",
          status: res.status,
          message: `HeyGen would not hand over the film (HTTP ${res.status}). ${await briefly(res)}`.trim(),
        },
      };
    }
    const parsed = parseAgentVideo(await res.json().catch(() => null));
    if (parsed === null) {
      return { ok: false, failure: { kind: "unreadable", message: "HeyGen's answer carried no film." } };
    }
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, failure: reasonFor(e, "collecting the finished film") };
  }
}
