/**
 * LIFE SCORE — the questionnaire engine's own test (src/core/e2/live/avatar/__tests__/avatarRescue.test.ts),
 * copied verbatim with only the import path changed.
 */
/**
 * THE PRESENTER REPAIRS ITSELF.
 *
 * ⚖️ JOHN, 2026-09-01. He replaced his avatar inside HeyGen and every recording
 * then failed — `avatar_not_found` — because the id lived in one setting that
 * only a person could keep in step. He was told to go and fix a setting. That
 * is not a product; this is the rule that replaces it.
 *
 * PURE. No key, no network: the whole rule is `pickUsableLook` plus a tolerant
 * reader, which is exactly why it can be pinned here.
 */
import { describe, expect, it } from "vitest";
import { parseLooksReply, pickUsableLook } from "../api/shared/heygen/heygenVideo";
import type { AvatarLook } from "../api/shared/heygen/heygenVideo";

const look = (id: string, over: Partial<AvatarLook> = {}): AvatarLook => ({
  id,
  status: "completed",
  engines: ["avatar_iv"],
  ...over,
});

describe("reading HeyGen's own list of looks", () => {
  it("takes the id, the name, the status and the engines", () => {
    const out = parseLooksReply({
      data: [
        {
          id: "lk_1",
          name: "Cristiano",
          status: "completed",
          supported_api_engines: ["avatar_iv", "avatar_v"],
        },
      ],
      has_more: false,
    });
    expect(out).toEqual([
      { id: "lk_1", name: "Cristiano", status: "completed", engines: ["avatar_iv", "avatar_v"] },
    ]);
  });

  it("skips a row with no id rather than failing the whole list", () => {
    const out = parseLooksReply({ data: [{ name: "nameless" }, { id: "lk_2" }] });
    expect(out.map((l) => l.id)).toEqual(["lk_2"]);
  });

  it("answers with an empty list for anything it cannot read", () => {
    expect(parseLooksReply(null)).toEqual([]);
    expect(parseLooksReply({})).toEqual([]);
    expect(parseLooksReply({ data: "not a list" })).toEqual([]);
  });
});

describe("choosing which look to film with", () => {
  it("🛑 KEEPS HIS CHOICE when the account still has it", () => {
    const looks = [look("lk_other"), look("lk_his")];
    expect(pickUsableLook(looks, "lk_his")).toBe("lk_his");
  });

  it("falls back to his own avatar only when the saved one is gone", () => {
    expect(pickUsableLook([look("lk_new")], "lk_deleted")).toBe("lk_new");
  });

  it("never picks one that is still training", () => {
    const looks = [look("lk_pending", { status: "pending" }), look("lk_ready")];
    expect(pickUsableLook(looks, "lk_deleted")).toBe("lk_ready");
  });

  it("never picks one that cannot run the engine we submit", () => {
    const looks = [look("lk_wrong", { engines: ["avatar_v"] }), look("lk_right")];
    expect(pickUsableLook(looks, "lk_deleted")).toBe("lk_right");
  });

  it("says no rather than guessing when the account has nothing usable", () => {
    expect(pickUsableLook([], "lk_deleted")).toBeNull();
    expect(pickUsableLook([look("lk_x", { status: "training" })], "lk_deleted")).toBeNull();
  });

  it("treats a look that names no engines as usable — a new field must not lock him out", () => {
    expect(pickUsableLook([look("lk_bare", { engines: [] })], "lk_deleted")).toBe("lk_bare");
  });
});
