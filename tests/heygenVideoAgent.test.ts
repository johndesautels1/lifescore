/**
 * LIFE SCORE — the questionnaire engine's own test (src/core/e2/live/film/__tests__/videoAgentFiles.test.ts),
 * copied verbatim with only the import path changed.
 */
/**
 * ⚖️ JOHN, 2026-09-11 08:04: HeyGen's film "looks nothing at all like what it
 *    should" — it had only our words. The files ride with the prompt now,
 *    in the shape read from developers.heygen.com/assets the same day.
 */
import { describe, expect, it } from "vitest";
import { AGENT_FILE_LIMIT, buildVideoAgentRequest } from "../api/shared/heygen/videoAgentRequest";

describe("files with the brief", () => {
  it("each file goes as a url entry, in order, beside the prompt", () => {
    const req = buildVideoAgentRequest({ prompt: "Make a film.", files: [{ url: "https://x/cristiano-1.jpg" }, { url: " https://x/b02s3.mp4 " }] });
    expect(req.body.files).toEqual([
      { type: "url", url: "https://x/cristiano-1.jpg" },
      { type: "url", url: "https://x/b02s3.mp4" },
    ]);
    expect(req.body.prompt).toBe("Make a film.");
  });

  it("no files means no files field — the shape HeyGen has taken since 1 September", () => {
    expect("files" in buildVideoAgentRequest({ prompt: "Make a film." }).body).toBe(false);
    expect("files" in buildVideoAgentRequest({ prompt: "Make a film.", files: [] }).body).toBe(false);
  });

  it("refuses a file that is not an https link, and more than the ceiling", () => {
    expect(() => buildVideoAgentRequest({ prompt: "x", files: [{ url: "file:///c/a.png" }] })).toThrow(RangeError);
    const many = Array.from({ length: AGENT_FILE_LIMIT + 1 }, (_, i) => ({ url: `https://x/${String(i)}.png` }));
    expect(() => buildVideoAgentRequest({ prompt: "x", files: many })).toThrow(RangeError);
  });
});

// LIFE SCORE addition: the v3 submit body for Cristiano's film.
describe("Cristiano film submit (v3 video agent)", () => {
  it("generates in one go, landscape, with his face and voice as fields", () => {
    const req = buildVideoAgentRequest({ prompt: "A city tour.", avatarId: "look_1", voiceId: "voice_1" });
    expect(req.url).toBe("https://api.heygen.com/v3/video-agents");
    expect(req.body).toEqual({ prompt: "A city tour.", mode: "generate", orientation: "landscape", avatar_id: "look_1", voice_id: "voice_1" });
  });
});
