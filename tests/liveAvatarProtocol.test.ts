/**
 * LIFE SCORE — the questionnaire engine's own test for this ported module
 * (src/core/olivia/__tests__/liteProtocol.test.ts), copied verbatim with only the import path changed. It fails if the
 * copied wiring is edited on one side only.
 */
/**
 * The five published LITE rules, locked. Ported with the module from London
 * Tech Map on 2026-09-04 — the rules are the vendor's, not ours, so the tests
 * that pin them travel with the code that obeys them.
 *
 * Each test names the vendor rule it enforces. If one of these goes red, the
 * avatar is being spoken to in a way the vendor documents as broken — usually
 * SILENTLY broken, which is exactly how this went unnoticed for a day.
 */

import { describe, it, expect } from "vitest";
import {
  planUtterance,
  sendUtterance,
  interruptCommand,
  keepAliveCommand,
  isConnectedEvent,
  isClosedEvent,
  utteranceId,
  LITE_SAMPLE_RATE_HZ,
  LITE_BYTES_PER_SECOND,
  LITE_FIRST_CHUNK_MS,
  LITE_CHUNK_MS,
  LITE_KEEP_ALIVE_MS,
  LITE_IDLE_TIMEOUT_MS,
  LITE_MAX_PACKET_CHARS,
} from "../src/lib/liveAvatar/liteProtocol";
import type { LiteCommand, PacedCommand } from "../src/lib/liveAvatar/liteProtocol";

/** The commands from a plan, without their send times. Typed as the protocol's
 *  own union so a test narrows by `type` exactly as a surface has to. */
function msgs(plan: readonly PacedCommand[]): LiteCommand[] {
  return plan.map((p) => p.message);
}

/** Base64 for `bytes` bytes of silence. */
function silence(bytes: number): string {
  return Buffer.alloc(bytes).toString("base64");
}

describe("audio spec — 24kHz or it is silently garbled", () => {
  it("holds the vendor's sample rate and byte maths", () => {
    expect(LITE_SAMPLE_RATE_HZ).toBe(24_000);
    expect(LITE_BYTES_PER_SECOND).toBe(48_000);
  });
});

describe("RULE 1 — one event_id across every chunk of an utterance", () => {
  // "Using different event_id values per chunk breaks playback."
  it("stamps the SAME id on every speak and on speak_end", () => {
    const messages = msgs(planUtterance(silence(LITE_BYTES_PER_SECOND * 4), "la_x"));
    const ids = new Set(
      messages.map((m) => ("event_id" in m ? m.event_id : "MISSING")),
    );
    expect(ids).toEqual(new Set(["la_x"]));
    expect(messages.length).toBeGreaterThan(2);
  });

  it("gives distinct ids to distinct utterances", () => {
    expect(utteranceId(1)).not.toBe(utteranceId(2));
  });
});

describe("RULE 2 — speak_end always closes the utterance", () => {
  // "Missing agent.speak_end prevents avatar state transitions."
  it("ends with speak_end, exactly once, and never starts with it", () => {
    const messages = msgs(planUtterance(silence(LITE_BYTES_PER_SECOND * 3), "la_x"));
    expect(messages.at(-1)?.type).toBe("agent.speak_end");
    expect(messages.filter((m) => m.type === "agent.speak_end")).toHaveLength(1);
    expect(messages[0].type).toBe("agent.speak");
  });

  it("says nothing at all for an empty clip — no stray speak_end", () => {
    expect(planUtterance("", "la_x")).toEqual([]);
    expect(planUtterance("   ", "la_x")).toEqual([]);
  });
});

describe("RULE 3 — 600ms opening buffer, then 1-second chunks", () => {
  it("makes the FIRST chunk 600ms and the rest 1s", () => {
    const messages = msgs(planUtterance(silence(LITE_BYTES_PER_SECOND * 5), "la_x"));
    const speaks = messages.filter((m) => m.type === "agent.speak");

    // 600ms = 28,800 bytes → 38,400 base64 chars. 1s = 48,000 → 64,000 chars.
    const firstChars = (m: LiteCommand) => (m.type === "agent.speak" ? m.audio.length : 0);
    expect(firstChars(speaks[0])).toBe(38_400);
    expect(firstChars(speaks[1])).toBe(64_000);
    expect(LITE_FIRST_CHUNK_MS).toBe(600);
    expect(LITE_CHUNK_MS).toBe(1_000);
  });

  it("loses NOTHING — the chunks rejoin into the original clip exactly", () => {
    const clip = Buffer.from(
      Array.from({ length: LITE_BYTES_PER_SECOND * 3 + 517 }, (_, i) => i % 251),
    ).toString("base64");
    const rejoined = msgs(planUtterance(clip, "la_x"))
      .filter((m) => m.type === "agent.speak")
      .map((m) => (m.type === "agent.speak" ? m.audio : ""))
      .join("");
    expect(rejoined).toBe(clip);
  });

  it("never exceeds the vendor's 1MB packet ceiling", () => {
    for (const m of msgs(planUtterance(silence(LITE_BYTES_PER_SECOND * 60), "la_x"))) {
      if (m.type === "agent.speak") {
        expect(m.audio.length).toBeLessThanOrEqual(LITE_MAX_PACKET_CHARS);
      }
    }
  });
});

describe("RULE 4 — nothing may be sent before 'connected'", () => {
  // "Events sent before receiving 'connected' are discarded" — silently.
  it("recognises only the real connected event", () => {
    expect(isConnectedEvent({ type: "session.state_updated", state: "connected" })).toBe(true);
    expect(isConnectedEvent({ type: "session.state_updated", state: "connecting" })).toBe(false);
    expect(isConnectedEvent({ type: "agent.speak_started", state: "connected" })).toBe(false);
    expect(isConnectedEvent(null)).toBe(false);
    expect(isConnectedEvent("connected")).toBe(false);
    expect(isConnectedEvent(undefined)).toBe(false);
  });

  it("recognises closing and closed as gone", () => {
    expect(isClosedEvent({ type: "session.state_updated", state: "closed" })).toBe(true);
    expect(isClosedEvent({ type: "session.state_updated", state: "closing" })).toBe(true);
    expect(isClosedEvent({ type: "session.state_updated", state: "connected" })).toBe(false);
  });
});

describe("RULE 5 — keep-alive inside the vendor's window", () => {
  it("pings well under the 5-minute idle timeout", () => {
    expect(LITE_IDLE_TIMEOUT_MS).toBe(300_000);
    expect(LITE_KEEP_ALIVE_MS).toBeLessThanOrEqual(180_000); // "every 2-3 minutes"
    expect(LITE_KEEP_ALIVE_MS).toBeGreaterThanOrEqual(120_000);
    expect(LITE_KEEP_ALIVE_MS).toBeLessThan(LITE_IDLE_TIMEOUT_MS / 1.5);
  });

  it("builds the documented command shapes", () => {
    expect(keepAliveCommand("la_x")).toEqual({
      type: "session.keep_alive",
      event_id: "la_x",
    });
    expect(interruptCommand()).toEqual({ type: "agent.interrupt" });
  });
});

describe("RULE 3b — pacing is a RATE, not just a size (self-audit fix)", () => {
  // The first fix got chunk SIZE right and left TIMING wrong: every chunk was
  // pushed in one tight loop, so a whole reply arrived at once. "Initial 600ms
  // buffer, then 1-second chunks THEREAFTER."
  it("stamps each chunk with when it is due", () => {
    const plan = planUtterance(silence(LITE_BYTES_PER_SECOND * 3), "la_x");
// 3s of audio = 600ms + 1s + 1s + 400ms. speak_end is due when the LAST
    // chunk's audio has actually been handed over: 2600 + 400 = 3000.
    expect(plan.map((p) => p.sendAtMs)).toEqual([0, 600, 1600, 2600, 3000]);
  });

  it("waits between chunks instead of blasting them", async () => {
    const plan = planUtterance(silence(LITE_BYTES_PER_SECOND * 2), "la_x");
    const waits: number[] = [];
    const sent: string[] = [];
    const count = await sendUtterance(
      plan,
      (m) => sent.push(m.type),
      undefined,
      async (ms) => {
        waits.push(ms);
      },
    );
    expect(count).toBe(plan.length);
    // 2s = 600ms + 1s + 400ms, so three chunks then the close.
    expect(waits).toEqual([600, 1000, 400]); // never zero, never all at once
    expect(sent.at(-1)).toBe("agent.speak_end");
  });

  it("stops mid-utterance when she is stopped — a paid call must not run on", async () => {
    const plan = planUtterance(silence(LITE_BYTES_PER_SECOND * 5), "la_x");
    const controller = new AbortController();
    const sent: string[] = [];
    const count = await sendUtterance(
      plan,
      (m) => {
        sent.push(m.type);
        if (sent.length === 2) controller.abort();
      },
      controller.signal,
      async () => {},
    );
    expect(count).toBe(2);
    expect(sent).not.toContain("agent.speak_end");
  });
});

describe("agent.* naming — avatar.* is FULL-mode only", () => {
  it("never emits an avatar.* command", () => {
    const messages = [
      ...msgs(planUtterance(silence(1_000), "la_x")),
      interruptCommand(),
      keepAliveCommand("la_x"),
    ];
    for (const m of messages) {
      expect(m.type.startsWith("avatar.")).toBe(false);
      expect(m.type === "session.keep_alive" || m.type.startsWith("agent.")).toBe(true);
    }
  });
});
