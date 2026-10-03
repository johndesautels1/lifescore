/**
 * LIFE SCORE — the questionnaire engine's own test for this ported module
 * (src/core/olivia/__tests__/liveAvatarSession.test.ts), copied verbatim with only the import path changed. It fails if the
 * copied wiring is edited on one side only.
 */
/**
 * 🛑 THE LITE SESSION TOKEN — the published schema, exactly, and the tripwires
 * that stop it being shortened again.
 *
 * ⚖️ John, 2026-09-04 22:03: *"it is paramount that that wiring is followed it
 * is complex and any short cuts will cause it not to work"*, and at 22:06:
 * *"audit every single solitary line of code of the london tech map olivia live
 * avatar integration and prove to me it is installed properly."*
 *
 * 🔴 WHAT THE AUDIT FOUND. This request was sending `{ avatar_id }` and nothing
 * else. No `mode`, so the vendor was never asked for a LITE session — the only
 * mode Olivia runs in. She could not appear, and pressing Play did nothing.
 *
 * Every assertion below mirrors one already standing in the wiring that is in
 * production in London Tech Map, named so a reader can go and check:
 *   `D:\London-Tech-Map\src\lib\integrations\heygen\liveavatar\client.ts:169`
 *   `D:\London-Tech-Map\tests\integrations\heygen-liveavatar-session.test.ts`
 */
import { describe, it, expect } from "vitest";
import { buildSessionTokenBody } from "../api/shared/liveAvatar";

describe("the LITE session token — the published schema, exactly", () => {
  it("declares LITE mode — the token is what decides which mode starts", () => {
    expect(buildSessionTokenBody("avatar_1").mode).toBe("LITE");
  });

  it("🛑 sends NO voice field, ever", () => {
    // "Voices are used in FULL Mode only. In LITE Mode, you bring your own
    // audio pipeline" — docs.liveavatar.com/docs/core-concepts/voices. The
    // vendor ACCEPTS a voice field here and ignores it, so adding one produces
    // a log line that looks like evidence and changes nothing.
    const body = buildSessionTokenBody("avatar_1");
    expect(body).not.toHaveProperty("voice_id");
    expect(body).not.toHaveProperty("voice_settings");
    expect(body).not.toHaveProperty("avatar_persona");
  });

  it("is the whole body, field for field — the shortcut that broke her", () => {
    expect(buildSessionTokenBody("avatar_1")).toEqual({
      avatar_id: "avatar_1",
      mode: "LITE",
      is_sandbox: false,
      video_settings: { quality: "high", encoding: "H264" },
      max_session_duration: 600,
    });
  });

  it("asks for `high` — the ONLY quality LITE accepts", () => {
    // The four-tier list (very_high|high|medium|low) is the FULL-mode schema.
    // Raising this to `very_high` on 2026-08-09 made the vendor reject the
    // session and took Olivia down on every surface at once. This is the
    // tripwire. Source: docs.liveavatar.com/docs/lite-mode/configuration
    expect(buildSessionTokenBody("a").video_settings).toEqual({
      quality: "high",
      encoding: "H264",
    });
  });

  it("never sends the deprecated VP8 encoding (vendor changelog 2026-07-22)", () => {
    const settings = buildSessionTokenBody("a").video_settings as { encoding: string };
    expect(settings.encoding).toBe("H264");
  });
});
