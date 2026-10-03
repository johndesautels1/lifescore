/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine's judge
 * page wiring (src/core/e2/live/avatar/heygenVideo.ts) on John's order: "cristiano use the JUDGE PAGE on
 * clues-questionnaire-engines exact cristiano wiring and his heygen id etc bite
 * identical but keep his replicate as backup". Only the two import paths
 * (".js" for the Vercel functions) differ. Change both copies together.
 *
 * ── The engine's own notes follow ──
 *
 * CLUES™ — CRISTIANO'S FILM. The HeyGen v3 video API, submit and poll.
 *
 * 🔴 THIS IS THE PRESENTER PRODUCT, NOT THE STREAMING ONE. HeyGen sells two
 * different things and they are not interchangeable:
 *
 *   • LiveAvatar / LITE — a realtime stream a person talks to. You supply the
 *     audio, it renders a face, and the person can interrupt it. **That is
 *     Olivia's system and a different setup.** Nothing in this directory
 *     touches it.
 *   • VIDEO (this file) — hand over a script, get back a finished film, play
 *     it. One way. Which is exactly what a judge delivering a ruling is.
 *
 * John, 2026-08-30: *"you must not use live avatar as that is for olivia and a
 * different setup."*
 *
 * ── THE CONTRACT, TAKEN FROM THE WIRING JOHN NAMED ──────────────────────────
 * Read out of `D:\London-Tech-Map\src\lib\integrations\heygen\video.ts` — the
 * Founder Viability Engine's presenter, which is the current, hardened wiring.
 * Line references are to that file so every claim here can be checked.
 *
 * • `POST /v3/videos` takes a DISCRIMINATED UNION keyed on a top-level `type`
 *   ("avatar" | "cinematic_avatar" | "image" | "studio"). The avatar variant is
 *   FLAT — `avatar_id`, `voice_id` and `script` sit at the TOP LEVEL (`:285`).
 *
 * 🛑 THE MISTAKE THAT COST THREE MONTHS, ON ANOTHER REPO, IN THIS EXACT PLACE
 *   (`:16-23`): a v2-shaped body — `video_inputs`, `dimension` — sent to the v3
 *   URL. HeyGen's deserialiser answers
 *       400 invalid_parameter — "Unable to extract tag using discriminator 'type'"
 *   and BOTH presenters that depended on it were silently dead until somebody
 *   read a production log. `buildVideoRequest` below is PURE and pinned by a
 *   choke-point test, so that shape is caught here and not in a log.
 *
 * • ENGINE IS **AVATAR IV**, NOT AVATAR V (`:196-215`). Avatar V requires the
 *   look to declare support and, for a photo avatar, auto-selects an
 *   `instant_avatar` sibling from the same group as a cross-reference.
 *   Cristiano's group has none, and HeyGen said so plainly:
 *       400 invalid_parameter — "No cross-reference candidate available for
 *       Avatar V. This photo avatar's group …"
 *   Avatar IV is the documented default, supports photo avatars, and needs no
 *   cross-reference. Sent EXPLICITLY so a change to HeyGen's default cannot
 *   move us silently.
 *
 * • `voice_settings` IS DELIBERATELY ABSENT (`:282`). The v2 body sent
 *   `speed: 1.0`, which is exactly v3's documented default — omitting it is
 *   identical behavior with one fewer field that can be rejected.
 *
 * 🛑 HEYGEN SPEAKS FOR ITSELF. `voice_id` is Cristiano's voice as it is
 * registered in the HeyGen account (John, 2026-08-30). There is NO separate
 * text-to-speech call, no PCM, no audio pipeline — all of which the streaming
 * product needs and this one does not.
 *
 * ── HOUSE RULES THIS FILE KEEPS ─────────────────────────────────────────────
 * Every reply is read through a tolerant hand-written parser that returns a
 * typed value or `null` — the same shape `src/core/gamma/gammaRequest.ts`
 * uses, because this repo does not carry a schema library and inventing a
 * second parsing style here would be the dual architecture we are forbidden.
 * Every call carries an explicit timeout composed with the caller's own signal.
 * Every failure is a typed `kind` a route switches on — never matched by prose.
 */
import { deriveVideoStatus, normaliseStatus } from "./videoStatus.js";
import type { VideoStatus } from "./videoStatus.js";

/** The vendor. One base, named once. */
const API_BASE = "https://api.heygen.com";

/**
 * HeyGen's own script ceiling is 5,000 characters; London Tech Map keeps a
 * buffer at 4,500 (`video.ts:225`) and so do we. Our judge says three things
 * rather than one, so this ceiling is real rather than theoretical — the
 * builder trims on a word boundary rather than mid-sentence.
 */
export const MAX_SCRIPT_CHARS = 4_500;

/**
 * Submit clock. Strictly below the route's own ceiling so a slow HeyGen
 * surfaces as our typed `timeout` rather than the platform killing the
 * function first (`video.ts:481`).
 */
const SUBMIT_TIMEOUT_MS = 20_000;

/** Poll clock — the status route runs on a short budget (`video.ts:484`). */
const STATUS_TIMEOUT_MS = 10_000;

/**
 * The scene behind him — the report's own dark ground, so the film sits in the
 * page rather than on top of it. A wire value for a vendor payload, not a
 * styling token: the design-system freeze governs what the app paints, and this
 * is what HeyGen paints.
 */
const BACKGROUND_COLOR = "#0a0e1a";

/** Per-call transport options. Every field optional; defaults are the house ones. */
export interface HeyGenVideoOptions {
  /** The caller's cancellation, composed with our own timeout. */
  signal?: AbortSignal;
  /** Hard ceiling for this call, in milliseconds. */
  timeoutMs?: number;
  /** Injected for test — no network, no key, no vendor. */
  fetchImpl?: typeof fetch;
  /** Injected for test, and the only way this module reads configuration. */
  env?: Record<string, string | undefined>;
  /** The title on HeyGen's own dashboard. Never shown to a reader. */
  title?: string;
  /**
   * ⚖️ WHO IS ON CAMERA, when it is not the house presenter (John,
   *    2026-09-05: the studio's film has three characters, not one judge).
   *
   * 🛑 ABSENT IS THE HOUSE PRESENTER, read from the environment exactly as
   *    before, so the judge's own filming cannot change by one field. Given, it
   *    is used instead — and the self-repair below still applies to whichever
   *    avatar was asked for, because a look that has been deleted is a look
   *    that has been deleted whoever chose it.
   */
  avatarId?: string;
  /** The voice for that face. Absent is the house voice. */
  voiceId?: string;
  /**
   * 🔴 JOHN, 2026-09-24: a picture behind the person, when the film has one —
   *    the studio films a character in front of a still of their own scene
   *    (`vis/takeBackdrop.ts`). Absent is the house colour, exactly as before,
   *    so the judge's own filming cannot change by one field.
   */
  backgroundUrl?: string;
  /**
   * 🔴 JOHN, 2026-09-24: the shape of the film the take is for. A tall film's
   *    take used to be asked for widescreen and cropped to a band. Absent is
   *    widescreen, exactly as before.
   */
  aspectRatio?: HeyGenAspect;
}

/**
 * HeyGen's Create Video reference, read 2026-09-24: "Output video aspect
 * ratio. Supported values: '16:9', '9:16', '4:5', '5:4', '1:1', 'auto'.
 * Defaults to '16:9'."
 */
export type HeyGenAspect = "16:9" | "9:16" | "4:5" | "5:4" | "1:1" | "auto";

/**
 * HeyGen's aspect for a film shape's ratio — the film's three are among its
 * six; anything else is widescreen.
 *
 * @param ratio e.g. `SHAPE.tall.ratio`
 */
export function heygenAspectFor(ratio: string | null | undefined): HeyGenAspect {
  const said = (ratio ?? "").trim();
  return said === "9:16" || said === "1:1" ? said : "16:9";
}

/**
 * Why a call failed, as a closed set. Routes switch on this to choose a status
 * code — no prose matching, so a missing key, an expired key and a vendor
 * outage can never end up wearing the same 500.
 */
export type HeyGenErrorKind =
  | "not_configured"
  | "bad_request"
  | "auth"
  | "payment"
  | "rate_limited"
  | "timeout"
  | "upstream"
  | "unreadable";

/** Every failure path throws this, and nothing else. */
export class HeyGenError extends Error {
  readonly kind: HeyGenErrorKind;
  /** The upstream code, when the failure came from a real reply. */
  readonly upstreamStatus?: number;

  constructor(kind: HeyGenErrorKind, message: string, upstreamStatus?: number) {
    super(message);
    this.name = "HeyGenError";
    this.kind = kind;
    this.upstreamStatus = upstreamStatus;
    // Keeps `instanceof` correct when TypeScript downlevels the class.
    Object.setPrototypeOf(this, HeyGenError.prototype);
  }
}

/** Narrowing guard, so callers never reach for `instanceof` across modules. */
export function isHeyGenError(err: unknown): err is HeyGenError {
  return err instanceof HeyGenError;
}

/**
 * Map a failure onto the status code and the sentence a reader can act on.
 *
 * 🛑 EXHAUSTIVE ON `kind`. The `never` branch means adding a kind without a
 * sentence fails the build rather than shipping a silent default.
 *
 * The codes are chosen, not guessed: a 4xx caused by OUR body is a 500 because
 * it is our defect and never a bad gateway; things a reader cannot fix by
 * retrying are 503; only a genuine vendor fault is 502, and our own abort 504.
 * No message names an environment variable or repeats a raw vendor body.
 */
export function describeHeyGenFailure(err: unknown): { status: number; message: string } {
  const kind: HeyGenErrorKind = isHeyGenError(err) ? err.kind : "upstream";
  switch (kind) {
    case "not_configured":
      return { status: 503, message: "The presenter is not set up yet." };
    case "auth":
      return { status: 503, message: "The video service did not accept our credentials." };
    case "payment":
      return { status: 503, message: "The video service is out of credit." };
    case "rate_limited":
      return { status: 429, message: "Too many presentations at once. Try again in a few minutes." };
    case "timeout":
      return { status: 504, message: "The video service took too long to answer. Please try again." };
    case "bad_request":
      return { status: 500, message: "We could not build the presentation. It has been logged." };
    case "unreadable":
      return { status: 502, message: "The video service returned something we could not read." };
    case "upstream":
      return { status: 502, message: "The video service is unavailable right now." };
    default: {
      const exhaustive: never = kind;
      return { status: 502, message: `The presentation failed. (${String(exhaustive)})` };
    }
  }
}

/**
 * Read one setting.
 *
 * 🛑 QUOTES AND WHITESPACE ARE STRIPPED. A key pasted from a dashboard with the
 * quotes still around it is rejected as an invalid credential, and the vendor's
 * error never mentions quotes — that cost an hour on the Serper key on
 * 2026-08-30.
 */
function readEnv(opts: HeyGenVideoOptions, name: string): string | undefined {
  const source =
    opts.env ?? (typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {});
  const raw = source[name];
  if (typeof raw !== "string") return undefined;
  const clean = raw.trim().replace(/^["']|["']$/g, "").trim();
  return clean === "" ? undefined : clean;
}

/** All three settings, or a typed refusal naming none of them to a reader. */
function credentials(opts: HeyGenVideoOptions): {
  apiKey: string;
  avatarId: string;
  voiceId: string;
} {
  const apiKey = readEnv(opts, "HEYGEN_API_KEY");
  // The caller's own face and voice win when it named them; otherwise the
  // house presenter, read exactly as this module always read it.
  const asked = (opts.avatarId ?? "").trim();
  const askedVoice = (opts.voiceId ?? "").trim();
  const avatarId = asked !== "" ? asked : readEnv(opts, "HEYGEN_AVATAR_LOOK_ID");
  const voiceId = askedVoice !== "" ? askedVoice : readEnv(opts, "HEYGEN_CRISTIANO_VOICE_ID");
  if (apiKey === undefined || avatarId === undefined || voiceId === undefined) {
    throw new HeyGenError(
      "not_configured",
      "HeyGen is not fully configured: the key, the avatar and the voice are all required.",
    );
  }
  return { apiKey, avatarId, voiceId };
}

/** True when all three settings are present — the surface asks before offering. */
export function videoConfigured(opts: HeyGenVideoOptions = {}): boolean {
  return (
    readEnv(opts, "HEYGEN_API_KEY") !== undefined &&
    readEnv(opts, "HEYGEN_AVATAR_LOOK_ID") !== undefined &&
    readEnv(opts, "HEYGEN_CRISTIANO_VOICE_ID") !== undefined
  );
}

/**
 * The exact v3 body. The literal `type: "avatar"` discriminator and every field
 * name here are the documented contract — do NOT rename or nest one without
 * re-reading the reference. See the header for what happens if you do.
 */
/** The render engine we submit. Named once so the body we send and the looks
 *  we are willing to accept can never drift apart. */
const SUBMIT_ENGINE = "avatar_iv" as const;

export interface HeyGenAvatarVideoRequest {
  readonly type: "avatar";
  readonly avatar_id: string;
  readonly voice_id: string;
  readonly script: string;
  readonly engine: { readonly type: typeof SUBMIT_ENGINE };
  readonly aspect_ratio: HeyGenAspect;
  /**
   * 🔴 THE SIDE BARS, FIXED AT SOURCE (John, 2026-09-01: *"His avatar has
   * padding on the left and right get rid of that."*).
   *
   * HeyGen composes the avatar into the frame with `contain` by default —
   * his whole figure fits in, and the rest is painted as background. That is
   * where the bars come from. They were never added by our cut.
   *
   * ⚖️ WHAT IS SENT IS `contain`, ON PURPOSE (2026-09-03, a2868da): `cover` at
   *    the vendor trimmed the top of his head. His whole figure is kept here,
   *    and OUR cut lays him on the film's stage with `cover` (timeline.ts,
   *    judgeClip), which fills the frame without cutting him. This comment
   *    used to argue for `cover` while the line below said `contain` (the
   *    line audit 2026-09-04, row 24).
   */
  readonly fit: "contain";
  /** v3's replacement for v2's `dimension: {width,height}`. */
  readonly resolution: "1080p";
  /**
   * HeyGen's Create Video reference, read 2026-09-24: `background.type` is
   * `color` ("Hex color code … Required when type is 'color'") or `image`
   * ("URL of the background image. Used when type is 'image'. Mutually
   * exclusive with asset_id") — images only, no video.
   */
  readonly background: { readonly type: "color"; readonly value: string } | { readonly type: "image"; readonly url: string };
  readonly title: string;
}

/** Trim to a whole word — a film that stops mid-word reads as a fault. */
export function clampToWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (lastStop > max * 0.6) return cut.slice(0, lastStop + 1).trim();
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * Build the submission body.
 *
 * PURE and exported, so the wire shape is verifiable with no key and no
 * network — which is the only reason the v2/v3 mismatch above is catchable in
 * a test rather than in a production log three months later.
 *
 * @throws {HeyGenError} `bad_request` for an empty script, `not_configured`
 * when the avatar or voice is missing.
 */
export function buildVideoRequest(input: {
  script: string;
  avatarId: string;
  voiceId: string;
  title?: string;
  /** A picture behind the person — an https link we hold. Absent is the house colour. */
  backgroundUrl?: string;
  /** The film's shape. Absent is widescreen, as before. */
  aspectRatio?: HeyGenAspect;
}): HeyGenAvatarVideoRequest {
  const script = clampToWordBoundary(input.script.trim(), MAX_SCRIPT_CHARS);
  if (script === "") {
    throw new HeyGenError("bad_request", "There is no verdict to present.");
  }
  if (input.avatarId.trim() === "" || input.voiceId.trim() === "") {
    throw new HeyGenError("not_configured", "The presenter's avatar and voice are both required.");
  }
  const backgroundUrl = (input.backgroundUrl ?? "").trim();
  if (backgroundUrl !== "" && !/^https:\/\//i.test(backgroundUrl)) {
    throw new HeyGenError("bad_request", "A picture behind the person must be an https link we hold.");
  }
  return {
    type: "avatar",
    avatar_id: input.avatarId.trim(),
    voice_id: input.voiceId.trim(),
    script,
    engine: { type: SUBMIT_ENGINE },
    aspect_ratio: input.aspectRatio ?? "16:9",
    fit: "contain",
    resolution: "1080p",
    // 🔴 2026-09-24: the studio's takes stand in a still of their own scene;
    //    the judge's keep the house colour, unchanged.
    background: backgroundUrl === "" ? { type: "color", value: BACKGROUND_COLOR } : { type: "image", url: backgroundUrl },
    title: input.title?.trim() || "CLUES — the judge's ruling",
  };
}

/** Compose our timeout with the caller's signal, on Node 20 and in a browser. */
function linkedSignal(timeoutMs: number, caller?: AbortSignal): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const relay = () => controller.abort(caller?.reason);
  if (caller) {
    if (caller.aborted) controller.abort(caller.reason);
    else caller.addEventListener("abort", relay, { once: true });
  }
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      caller?.removeEventListener("abort", relay);
    },
  };
}

/** Map an upstream code onto our closed set. */
function kindForStatus(status: number): HeyGenErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 402) return "payment";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "upstream";
  return "bad_request";
}

/** One call to the vendor, with the whole failure taxonomy applied. */
async function call(
  path: string,
  init: RequestInit,
  opts: HeyGenVideoOptions,
  timeoutMs: number,
): Promise<unknown> {
  const { apiKey } = credentials(opts);
  const doFetch = opts.fetchImpl ?? fetch;
  const { signal, done } = linkedSignal(opts.timeoutMs ?? timeoutMs, opts.signal);
  try {
    const res = await doFetch(`${API_BASE}${path}`, {
      ...init,
      signal,
      headers: {
        "content-type": "application/json",
        // The documented v3 auth header (`video.ts:632`). Not a bearer token.
        "X-Api-Key": apiKey,
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new HeyGenError(
        kindForStatus(res.status),
        `HeyGen ${path} answered ${res.status}: ${text.slice(0, 400)}`,
        res.status,
      );
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new HeyGenError("unreadable", `HeyGen ${path} returned a body we could not parse.`);
    }
  } catch (err) {
    if (isHeyGenError(err)) throw err;
    const name = err instanceof Error ? err.name : "";
    const raw = err instanceof Error ? err.message : String(err);
    if (name === "AbortError" || name === "TimeoutError" || /abort|timeout/i.test(raw)) {
      throw new HeyGenError("timeout", "HeyGen did not answer in time.");
    }
    throw new HeyGenError("upstream", `HeyGen could not be reached: ${raw}`);
  } finally {
    done();
  }
}

/**
 * Read a submit reply.
 *
 * Tolerant on purpose: HeyGen may add fields at any time and an unknown key
 * must never fail a submission that otherwise succeeded. Returns `null` rather
 * than throwing, so the caller owns the sentence.
 */
export function parseSubmitReply(body: unknown): { videoId: string } | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const id = (data as { video_id?: unknown }).video_id;
  if (typeof id !== "string" || id.trim() === "") return null;
  return { videoId: id.trim() };
}

/** What the surface is told about a render in flight. */
export interface VideoState {
  status: VideoStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  /**
   * How long the finished recording actually runs, in seconds.
   *
   * 🔴 HEYGEN HAS ALWAYS SENT THIS AND WE HAVE ALWAYS THROWN IT AWAY (found by
   * an independent audit, 2026-09-02). Two defects came out of that one dropped
   * field: the film's soundtrack was written for ZERO seconds and clamped up to
   * the vendor's three-second floor — a three-second bed under a four-minute
   * film, paid for — and the correction that puts the picture track on the
   * recording's real clock could never run, because it only runs when the real
   * length is known.
   *
   * Absent when the vendor did not say. Never guessed.
   */
  seconds?: number;
  /**
   * Where the recording's subtitle file lives, when the vendor made one.
   *
   * 🔴 THE OTHER FIELD WE WERE DROPPING. Every caption line in it is timed to
   * the moment it is actually spoken, which is the only way a picture can be
   * put on the sentence it belongs to. Without it `captions.ts` — a module
   * written for exactly this — had no way to be reached at all.
   */
  subtitleUrl?: string;
  /** Present only on a failure — HeyGen's own sentence, when it gave one. */
  error?: string;
}

/**
 * Read a status reply.
 *
 * 🛑 The state is DERIVED, never read off `data.status` — see `videoStatus.ts`
 * for the production incident that rule comes from.
 */
export function parseStatusReply(body: unknown): VideoState | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

  const failureMessage = str(d.failure_message);
  const status = deriveVideoStatus({
    status: str(d.status),
    videoUrl: str(d.video_url),
    completedAt: typeof d.completed_at === "number" ? d.completed_at : undefined,
    failureCode: d.failure_code,
    failureMessage,
  });

  return {
    status: normaliseStatus(status),
    ...(str(d.video_url) ? { videoUrl: str(d.video_url) as string } : {}),
    ...(str(d.thumbnail_url) ? { thumbnailUrl: str(d.thumbnail_url) as string } : {}),
    // The vendor's own measurement of the file it just made. Only kept when it
    // is a real positive number — a zero or a missing field means "not said",
    // and the caller must fall back to the plan rather than to a made-up clock.
    ...(typeof d.duration === "number" && Number.isFinite(d.duration) && d.duration > 0
      ? { seconds: d.duration }
      : {}),
    // The subtitle track, which carries the real second every line is spoken.
    ...(str(d.subtitle_url) ? { subtitleUrl: str(d.subtitle_url) as string } : {}),
    ...(status === "failed" ? { error: failureMessage ?? "The render failed." } : {}),
  };
}

/**
 * One of THIS ACCOUNT'S OWN avatar looks, as `/v3/avatars/looks` returns it.
 *
 * ⚖️ WHY THIS EXISTS (John, 2026-09-01). He replaced his avatar inside HeyGen.
 * Every recording then failed — `avatar_not_found` — because one stored id in one
 * setting is a single point of failure only a human can repair, and he had to be
 * told to go and repair it. A product should not depend on a person keeping two
 * systems in step by hand.
 */
export interface AvatarLook {
  /** THE id to pass as `avatar_id`: HeyGen’s reference is explicit that a video
   *  takes a LOOK id, never the group id. */
  readonly id: string;
  readonly name?: string;
  /** "completed" when it can be filmed with. Anything else is still training. */
  readonly status?: string;
  /** `supported_api_engines` — we submit `avatar_iv`, so it must be in here. */
  readonly engines: readonly string[];
}

/**
 * Read the looks list.
 *
 * Tolerant by design: HeyGen may add fields at any time, and a look we cannot
 * fully understand is skipped rather than failing the whole list.
 *
 * @param body the parsed reply
 * @returns every look we could read, in the order HeyGen returned them
 */
export function parseLooksReply(body: unknown): AvatarLook[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  const out: AvatarLook[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    if (id === "") continue;
    const engines = Array.isArray(r.supported_api_engines)
      ? r.supported_api_engines.filter((e): e is string => typeof e === "string")
      : [];
    out.push({
      id,
      ...(typeof r.name === "string" ? { name: r.name } : {}),
      ...(typeof r.status === "string" ? { status: r.status } : {}),
      engines,
    });
  }
  return out;
}

/**
 * Which look this account can actually film with.
 *
 * 🛡 THE CONFIGURED ONE ALWAYS WINS when the account still has it — his choice
 * of presenter is his, and this must never quietly swap a face he picked. Only
 * when HeyGen says that id does not exist do we fall back, and then to one of
 * HIS OWN looks (the list is asked for with `ownership=private`), never to a
 * stranger from HeyGen’s public gallery.
 *
 * PURE, so the rule is testable without a key and without a network.
 *
 * @param looks the account's own looks
 * @param configured the id in the setting
 * @returns the id to film with, or null when the account has nothing usable
 */
export function pickUsableLook(looks: readonly AvatarLook[], configured: string): string | null {
  const wanted = configured.trim();
  if (wanted !== "" && looks.some((l) => l.id === wanted)) return wanted;
  const usable = looks.filter(
    (l) =>
      (l.status === undefined || l.status === "completed") &&
      (l.engines.length === 0 || l.engines.includes(SUBMIT_ENGINE)),
  );
  return usable[0]?.id ?? null;
}

/** The account's own looks. FREE — a read, never a render. */
export async function listOwnLooks(opts: HeyGenVideoOptions = {}): Promise<AvatarLook[]> {
  const raw = await call(
    "/v3/avatars/looks?ownership=private&limit=50",
    { method: "GET" },
    opts,
    STATUS_TIMEOUT_MS,
  );
  return parseLooksReply(raw);
}

/**
 * One voice this account can film with, as `GET /v3/voices` returns it.
 *
 * ⚖️ JOHN, 2026-09-02: *"The judges voice is NOT our eleven labs cristiano voice
 *    and it is critical that we use his exact voice. Where did you get that
 *    voice."*
 *
 * 🛑 THE HONEST ANSWER TO HIS QUESTION: nowhere. Nothing in this product has
 *    ever chosen a voice. It sends whatever id `HEYGEN_CRISTIANO_VOICE_ID`
 *    holds, and HeyGen speaks it. The voice he heard is a HeyGen voice because
 *    that setting names one.
 *
 * 🛑 AND THAT IS WHY THIS LIST EXISTS. An ElevenLabs voice reaches HeyGen by
 *    connecting the two accounts inside HeyGen, after which it appears in
 *    HeyGen's own voice library as a PRIVATE voice with a HeyGen voice id. The
 *    id he needs is therefore in his account and nowhere in this repo — exactly
 *    the argument the avatar list already exists to end. He can now read it off
 *    the check panel instead of hunting for it.
 *
 * CONTRACT READ FROM THE PRIMARY SOURCE, 2026-09-02:
 * `GET /v3/voices` → { data: [{ voice_id, name, language, gender,
 * preview_audio_url, support_pause, support_locale, type }], has_more,
 * next_token }, with `type` filterable as "public" | "private" and `limit`
 * 1-100. Nothing here is inferred from another endpoint's shape.
 */
export interface HeyGenVoice {
  /** THE id to pass as `voice_id`. */
  readonly id: string;
  readonly name?: string;
  readonly language?: string;
  /**
   * "private" for this account's own — which is where a voice connected from
   * a third-party provider lands.
   *
   * 🛑 THE PROVIDER'S NAME STAYS OUT OF THE FIRST LINE OF A DOC COMMENT, and
   *    that is not fussiness: the guard in `avatarWiring.test.ts` bans the
   *    streaming product's vocabulary from this directory and reads any line
   *    that does not OPEN with a comment marker as real code. A `/**` line does
   *    not open with one. The ban is right and the guard is right; the sentence
   *    moves.
   */
  readonly kind?: string;
}

/**
 * Read the voices list.
 *
 * Tolerant by design, for the same reason `parseLooksReply` is: HeyGen may add
 * fields at any time, and a voice we cannot fully understand is skipped rather
 * than failing the whole list.
 *
 * @param body the parsed reply
 * @returns every voice we could read, in the order HeyGen returned them
 */
export function parseVoicesReply(body: unknown): HeyGenVoice[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  const out: HeyGenVoice[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.voice_id === "string" ? r.voice_id.trim() : "";
    if (id === "") continue;
    out.push({
      id,
      ...(typeof r.name === "string" ? { name: r.name } : {}),
      ...(typeof r.language === "string" ? { language: r.language } : {}),
      ...(typeof r.type === "string" ? { kind: r.type } : {}),
    });
  }
  return out;
}

/**
 * This account's OWN voices. FREE — a read, never a render.
 *
 * 🛑 `type=private` ON PURPOSE. HeyGen's public library runs to hundreds of
 *    voices and none of them is his; the one he is looking for is his own, and
 *    a connected ElevenLabs voice is private by definition.
 */
export async function listOwnVoices(opts: HeyGenVideoOptions = {}): Promise<HeyGenVoice[]> {
  const raw = await call("/v3/voices?type=private&limit=100", { method: "GET" }, opts, STATUS_TIMEOUT_MS);
  return parseVoicesReply(raw);
}

/**
 * Did HeyGen say the avatar itself does not exist?
 *
 * Reads the vendor’s OWN error code out of the body we kept, plus the 404 —
 * never a match on a human sentence, which would break the day they reword it.
 */
function isAvatarMissing(err: unknown): boolean {
  return isHeyGenError(err) && err.upstreamStatus === 404 && /avatar_not_found/i.test(err.message);
}

/**
 * Submit the ruling for filming.
 *
 * ⚖️ IT REPAIRS ITSELF ONCE (John, 2026-09-01). If HeyGen says the configured
 * avatar does not exist, we ask his account which avatars it DOES have and film
 * with his own one, rather than failing and telling him to go and edit a
 * setting. Exactly one retry, and only for that one vendor code — a blind retry
 * on any failure is how you pay twice.
 *
 * @returns the id to poll with {@link videoState}, and which avatar was used.
 * @throws {HeyGenError} on every failure path, with a discriminated `kind`.
 */
export async function submitVideo(
  script: string,
  opts: HeyGenVideoOptions = {},
): Promise<{ videoId: string; avatarUsed: string }> {
  const { avatarId, voiceId } = credentials(opts);
  const send = async (useAvatar: string): Promise<{ videoId: string }> => {
    const body = buildVideoRequest({ script, avatarId: useAvatar, voiceId, title: opts.title, backgroundUrl: opts.backgroundUrl, aspectRatio: opts.aspectRatio });
    const raw = await call(
      "/v3/videos",
      { method: "POST", body: JSON.stringify(body) },
      opts,
      SUBMIT_TIMEOUT_MS,
    );
    const parsed = parseSubmitReply(raw);
    if (!parsed) {
      throw new HeyGenError("unreadable", "HeyGen took the script but returned no video id.");
    }
    return parsed;
  };

  try {
    return { ...(await send(avatarId)), avatarUsed: avatarId };
  } catch (err) {
    if (!isAvatarMissing(err)) throw err;
    // The stored presenter is gone from his account. Ask what is actually there.
    const looks = await listOwnLooks(opts);
    const rescue = pickUsableLook(looks, avatarId);
    if (rescue === null || rescue === avatarId) {
      throw new HeyGenError(
        "not_configured",
        looks.length === 0
          ? "HeyGen has no avatar of your own to film with."
          : `The saved presenter is gone from HeyGen. Your own avatars are: ${looks
              .map((l) => l.name ?? l.id)
              .slice(0, 5)
              .join(", ")}.`,
        404,
      );
    }
    return { ...(await send(rescue)), avatarUsed: rescue };
  }
}

/**
 * Ask how the render is going.
 *
 * A render HeyGen itself reports as failed comes back as a VALUE, not a throw —
 * that is a result, not a transport fault, and the surface must be able to tell
 * the two apart.
 */
export async function videoState(
  videoId: string,
  opts: HeyGenVideoOptions = {},
): Promise<VideoState> {
  const id = videoId.trim();
  if (id === "") throw new HeyGenError("bad_request", "No video was named.");
  const raw = await call(
    `/v3/videos/${encodeURIComponent(id)}`,
    { method: "GET" },
    opts,
    STATUS_TIMEOUT_MS,
  );
  const parsed = parseStatusReply(raw);
  if (!parsed) {
    throw new HeyGenError("unreadable", "HeyGen's answer carried no render to report on.");
  }
  return parsed;
}
