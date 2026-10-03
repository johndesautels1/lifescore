/**
 * LIFE SCORE — PORTED VERBATIM 2026-10-03 from the questionnaire engine's judge
 * page wiring (src/core/e2/live/avatar/videoStatus.ts) on John's order: "cristiano use the JUDGE PAGE on
 * clues-questionnaire-engines exact cristiano wiring and his heygen id etc bite
 * identical but keep his replicate as backup". Change both copies together.
 *
 * ── The engine's own notes follow ──
 *
 * CLUES™ — WHAT HEYGEN'S ANSWER ACTUALLY MEANS. Pure: no IO, no clock, no env.
 *
 * 🛑 THE SCAR THIS FILE EXISTS FOR — read it before touching the order below.
 * `GET /v3/videos/{id}` documents its COMPLETED response as id / title /
 * created_at / completed_at / video_url / thumbnail_url / failure_code /
 * failure_message — with NO `status` field at all. London Tech Map's reader took
 * `data.status`, found nothing, and fell back to the literal string
 * "processing". Because "processing" is a KNOWN value it never warned, so a
 * finished video polled as "processing" until the client gave up: John could
 * watch the film on heygen.com while the page told him it was still rendering
 * (production, 2026-07-19 — `D:\London-Tech-Map\src\lib\integrations\heygen\
 * video.ts:345-367`).
 *
 * 🛑 THE ORDER IS DELIBERATE AND MUST NOT BE REARRANGED:
 *   ① a failure outranks everything — a reply carrying both a URL and a failure
 *     is a failure, and playing it would be showing a broken film;
 *   ② a real `video_url` outranks any status string — the URL is the ground
 *     truth that the render finished, and it is what the scar above was about;
 *   ③ only then a status string, mapped through the alias table;
 *   ④ then `completed_at` being a real moment;
 *   ⑤ otherwise still processing, which is what keeps the poll alive.
 */

/** The four states a render can be in, as this product speaks of them. */
export type VideoStatus = "pending" | "processing" | "completed" | "failed";

/**
 * The fields of a v3 retrieve-video reply that decide the state, already read
 * off the wire and narrowed. Every one is optional because every one is absent
 * in some real reply — that is the whole point of the file.
 */
export interface VideoFacts {
  /** HeyGen's own word for it, when it sends one at all. */
  status?: string;
  /** The finished film. Its presence is proof the render completed. */
  videoUrl?: string;
  /** Epoch seconds. Present on a completed render, absent while rendering. */
  completedAt?: number;
  /** Any non-null value means the render failed; the shape is not documented. */
  failureCode?: unknown;
  /** HeyGen's sentence about the failure, when it gives one. */
  failureMessage?: string;
}

/** The states we already speak. */
const KNOWN: ReadonlySet<string> = new Set<VideoStatus>([
  "pending",
  "processing",
  "completed",
  "failed",
]);

/**
 * Words HeyGen has been observed to use that are not our four.
 *
 * 🛑 An unknown word maps to "processing", NOT to "failed". Guessing failure on
 * a word we have not seen before would abandon a render that is still running
 * and still being paid for; guessing "processing" costs one more poll.
 */
const ALIASES: Readonly<Record<string, VideoStatus>> = {
  cancelled: "failed",
  canceled: "failed",
  error: "failed",
  timeout: "failed",
  queued: "pending",
  waiting: "pending",
  draft: "pending",
  rendering: "processing",
  processing: "processing",
};

/** Map one raw status word onto ours. Unknown words keep the poll alive. */
export function normaliseStatus(raw: string): VideoStatus {
  const word = raw.trim().toLowerCase();
  if (KNOWN.has(word)) return word as VideoStatus;
  return ALIASES[word] ?? "processing";
}

/** True when HeyGen has told us, in either of its two ways, that it failed. */
function looksFailed(facts: VideoFacts): boolean {
  if (facts.failureCode !== undefined && facts.failureCode !== null) return true;
  return (facts.failureMessage ?? "").trim() !== "";
}

/**
 * Decide the real state of a render from what the reply actually carried.
 *
 * @param facts the narrowed fields of one `GET /v3/videos/{id}` reply.
 * @returns the state to act on — see the header for why this order.
 */
export function deriveVideoStatus(facts: VideoFacts): VideoStatus {
  if (looksFailed(facts)) return "failed";
  if ((facts.videoUrl ?? "").trim() !== "") return "completed";
  if ((facts.status ?? "").trim() !== "") return normaliseStatus(facts.status as string);
  if (typeof facts.completedAt === "number" && facts.completedAt > 0) return "completed";
  return "processing";
}

/** A render that will never change again — the poll may stop. */
export function isSettled(status: VideoStatus): boolean {
  return status === "completed" || status === "failed";
}
