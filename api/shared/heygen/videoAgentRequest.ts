/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine
 * (src/core/e2/live/film/videoAgentRequest.ts), the HeyGen wiring Cristiano's films use there. Change both
 * copies together.
 *
 * ── The engine's own notes follow ──
 *
 * CLUES™ — HEYGEN VIDEO AGENT, THE WIRE SHAPE.
 *
 * ⚖️ JOHN, 2026-09-01: *"make it so that we might throw the entire prompt at hey
 * gen via the api and have it return a plug and play video into our display
 * screen so make sure your wiring supports that avenue as well."* This is that
 * avenue: one prompt in, one finished multi-scene film out.
 *
 * ── THE CONTRACT, READ FROM HEYGEN'S OWN REFERENCE 2026-09-01, NOT RECALLED ──
 *
 *   submit  POST https://api.heygen.com/v3/video-agents
 *           header  X-Api-Key
 *           body    { prompt, mode?, avatar_id?, voice_id?, orientation?,
 *                     callback_url?, callback_id? }
 *           → { data: { session_id, status, video_id } }
 *
 *   step 1  GET https://api.heygen.com/v3/video-agents/{session_id}
 *           → poll until `video_id` is assigned
 *
 *   step 2  GET https://api.heygen.com/v3/videos/{video_id}
 *           → { data: { status, video_url, duration } }
 *
 * 🛑 TWO POLLS, NOT ONE. The session hands out a video id only once the agent
 * has finished planning; polling the video id before it exists is how a caller
 * concludes "failed" on a film that is going perfectly well.
 *
 * 🛑 `prompt` IS CAPPED AT 10,000 CHARACTERS by the vendor. `agentPrompt.ts`
 * builds inside that cap; this module refuses anything over it rather than
 * letting the vendor truncate our words somewhere we cannot see.
 *
 * PURE. No clock, no network: every shape here is verifiable without a key.
 */

/** HeyGen's own base for this product. */
export const AGENT_BASE = "https://api.heygen.com/v3";

/** The documented auth header. Not a bearer token. */
export const AGENT_KEY_HEADER = "X-Api-Key";

/**
 * The vendor's cap on the prompt field — "1-10000 characters" at
 * developers.heygen.com/reference/create-video-agent-session, re-read 2026-09-11.
 */
export const AGENT_PROMPT_LIMIT = 10_000;
/**
 * ⚖️ JOHN, 2026-09-11 08:04, after HeyGen's film "looks nothing at all like
 *    what it should": the agent takes files with the prompt. Read from
 *    developers.heygen.com/assets on 2026-09-11: `files: [{ type: "url",
 *    url }]` beside `prompt` on POST /v3/video-agents, 32 MB a file.
 *    Re-read the same day at developers.heygen.com/reference/
 *    create-video-agent-session: `files` — "maxItems: 20". (Until 08:35 this
 *    said 30, our own guess; a film with more than twenty files would have
 *    been refused at the vendor's door.)
 */
export const AGENT_FILE_LIMIT = 20;

/** One of our own files, by a link HeyGen can fetch (a signed one is fine). */
export interface VideoAgentFile {
  readonly url: string;
}

export interface VideoAgentAsk {
  readonly prompt: string;
  /** Our faces and footage, so the film is ours — see AGENT_FILE_LIMIT. */
  readonly files?: readonly VideoAgentFile[];
  /** Our own presenter, so every film wears the same face. */
  readonly avatarId?: string;
  readonly voiceId?: string;
  /**
   * ⛔ NOT SENT. There is no webhook.
   *
   * 🔴 IT WAS SENT, AND THE COMMENT DESCRIBED INFRASTRUCTURE THAT DOES NOT
   *    EXIST (second audit, 2026-09-02, finding 30). It read *"echoed back on
   *    the webhook so a film can be matched to its row"* — `api/report/` holds
   *    no callback route, and `callback_url` was never sent either, so nothing
   *    could ever echo anything back. What it actually did was hand our own
   *    internal film id to a third party for no purpose at all.
   *
   * 🛑 THE FIELD STAYS IN THE TYPE, UNSENT, because the vendor's documented
   *    shape is a record worth keeping — the day a webhook is built, this is
   *    where it plugs in, and the header above says what to send with it. What
   *    does not stay is a value on the wire with no receiver.
   */
  readonly callbackId?: string;
}

export interface VideoAgentRequest {
  readonly url: string;
  readonly body: {
    readonly prompt: string;
    readonly mode: "generate";
    readonly orientation: "landscape";
    readonly avatar_id?: string;
    readonly voice_id?: string;
    readonly callback_id?: string;
    readonly files?: ReadonlyArray<{ readonly type: "url"; readonly url: string }>;
  };
}

/** The header block, so a key can never be built into a URL by accident. */
export function agentHeaders(key: string): Record<string, string> {
  return { [AGENT_KEY_HEADER]: key };
}

/**
 * Build the submit call.
 *
 * 🛑 `mode: "generate"` — fire and forget. `"chat"` pauses for a human to
 * review, which would hang a server route waiting for a person who is not there.
 *
 * @param ask the prompt and, optionally, our own presenter
 * @throws {RangeError} when the prompt is empty or over the vendor's cap
 */
export function buildVideoAgentRequest(ask: VideoAgentAsk): VideoAgentRequest {
  const prompt = ask.prompt.trim();
  if (prompt === "") throw new RangeError("There is no film to describe.");
  if (prompt.length > AGENT_PROMPT_LIMIT) {
    throw new RangeError(
      `The brief is ${prompt.length} characters; HeyGen accepts ${AGENT_PROMPT_LIMIT}.`,
    );
  }
  const avatar = (ask.avatarId ?? "").trim();
  const voice = (ask.voiceId ?? "").trim();
  const files = (ask.files ?? []).map((f) => f.url.trim()).filter((u) => u !== "");
  for (const u of files) {
    if (!/^https:\/\//i.test(u)) throw new RangeError("A file can only go to HeyGen by an https link we made.");
  }
  if (files.length > AGENT_FILE_LIMIT) {
    throw new RangeError(`${files.length} files were offered; at most ${AGENT_FILE_LIMIT} go with one brief.`);
  }
  return {
    url: `${AGENT_BASE}/video-agents`,
    body: {
      prompt,
      mode: "generate",
      orientation: "landscape",
      ...(avatar !== "" ? { avatar_id: avatar } : {}),
      ...(voice !== "" ? { voice_id: voice } : {}),
      ...(files.length > 0 ? { files: files.map((url) => ({ type: "url" as const, url })) } : {}),
      // 🛑 NO `callback_id`. See `callbackId` above: there is no webhook to
      //    echo it back, so sending our film's id to a vendor buys nothing and
      //    tells them something about us for free.
    },
  };
}

/** Where a session is polled. */
export function sessionUrl(sessionId: string): string {
  return `${AGENT_BASE}/video-agents/${encodeURIComponent(sessionId.trim())}`;
}

/** Where the finished film is polled. */
export function videoUrl(videoId: string): string {
  return `${AGENT_BASE}/videos/${encodeURIComponent(videoId.trim())}`;
}

/**
 * Read the submit reply.
 *
 * Tolerant by design: an unknown field must never fail a submission that
 * otherwise succeeded. Returns null rather than throwing so the caller owns the
 * sentence a reader sees.
 */
export function parseAgentSubmit(body: unknown): { sessionId: string; videoId: string | null } | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const session = typeof d.session_id === "string" ? d.session_id.trim() : "";
  if (session === "") return null;
  const video = typeof d.video_id === "string" && d.video_id.trim() !== "" ? d.video_id.trim() : null;
  return { sessionId: session, videoId: video };
}

/** What a session poll tells us. */
export interface AgentSessionState {
  readonly status: string;
  readonly videoId: string | null;
  /** The vendor's own words when it gave up. */
  readonly error: string | null;
}

export function parseAgentSession(body: unknown): AgentSessionState | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const status = typeof d.status === "string" ? d.status.trim() : "";
  if (status === "") return null;
  return {
    status,
    videoId: typeof d.video_id === "string" && d.video_id.trim() !== "" ? d.video_id.trim() : null,
    error: typeof d.error === "string" && d.error.trim() !== "" ? d.error.trim() : null,
  };
}

/** What a finished film looks like. */
export interface AgentVideoState {
  /**
   * 🔴 `finished_no_file` EXISTS BECAUSE THE ALTERNATIVE WAS A DEAD END (second
   *    audit, 2026-09-02, finding 24). "Completed, and here is no file" used to
   *    fall through to `pending`, for ever — so a film the vendor considered
   *    DONE and had already charged for was polled until the card gave up and
   *    then reported as too slow. It is a distinct, terminal-looking state and
   *    it is now named as one, so a caller can say something true about it.
   */
  readonly status: "pending" | "completed" | "finished_no_file" | "failed";
  readonly url: string | null;
  readonly seconds: number | null;
  readonly error: string | null;
}

/**
 * Read a video poll.
 *
 * 🛑 A STATUS WE DO NOT RECOGNISE IS PENDING, NEVER FAILED. Treating an unknown
 * word as failure would throw away a film the vendor is still working on — and
 * one we have already paid for.
 */
export function parseAgentVideo(body: unknown): AgentVideoState | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const raw = typeof d.status === "string" ? d.status.trim().toLowerCase() : "";
  if (raw === "") return null;
  const url = typeof d.video_url === "string" && d.video_url.trim() !== "" ? d.video_url.trim() : null;
  const seconds = typeof d.duration === "number" && Number.isFinite(d.duration) ? d.duration : null;
  const error =
    typeof d.error === "string" && d.error.trim() !== ""
      ? d.error.trim()
      : typeof d.message === "string" && d.message.trim() !== ""
        ? d.message.trim()
        : null;

  if (raw === "failed" || raw === "error") return { status: "failed", url: null, seconds, error };
  if (raw === "completed" && url !== null) return { status: "completed", url, seconds, error: null };
  if (raw === "completed") {
    // Finished, by the vendor's own word, with nothing to play. Not pending —
    // nothing more is coming on its own — and not failed either, because the
    // file may still appear. The caller decides what to say; it is no longer
    // silently indistinguishable from "still working".
    return {
      status: "finished_no_file",
      url: null,
      seconds,
      error: "The film service says the film is finished but named no file.",
    };
  }
  // 🛑 AN UNKNOWN WORD IS STILL PENDING. That rule is right and is unchanged:
  //    treating a status we have not seen before as failure would throw away a
  //    film the vendor is still making, and one we have already paid for.
  return { status: "pending", url: null, seconds, error: null };
}
