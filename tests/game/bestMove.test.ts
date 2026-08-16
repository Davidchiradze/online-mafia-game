import { describe, it, expect } from "vitest";
import {
  isBestMoveEligible,
  isBestMoveComplete,
} from "@convex/games/sports/bestMove";
import { SPORTS_PHASES, sportsNextPhase } from "@convex/games/sports/phases";
import { SPORTS_DEFINITION } from "@convex/games/sports/definition";
import { JAPANESE_DEFINITION } from "@convex/games/japanese/definition";
import { SPORTS } from "@convex/lib/constants";

/**
 * Sports "best move" (docs/variants/sports/rules.md §6) — the pure rules.
 *
 * Mirrors the §6.8 edge-case table one-for-one, so the doc and the code cannot
 * drift apart silently.
 */

describe("isBestMoveEligible (§6.1)", () => {
  const base = { nightNumber: 1, killedSeatCount: 1, deadSeatedCount: 0 };

  it("grants when night 1 killed exactly one and NOBODY left on day 1", () => {
    // Day 1 removed no one — e.g. the day-1 single-nominee rule (§4.1).
    expect(isBestMoveEligible({ ...base, deadSeatedCount: 0 })).toBe(true);
  });

  it("grants when exactly ONE player left on day 1", () => {
    expect(isBestMoveEligible({ ...base, deadSeatedCount: 1 })).toBe(true);
  });

  it("VOIDS the best move when two players left on day 1", () => {
    // The both-leave tie-break, or a vote-out plus a 4th-foul elimination.
    expect(isBestMoveEligible({ ...base, deadSeatedCount: 2 })).toBe(false);
  });

  it("voids the best move when more than two left on day 1", () => {
    expect(isBestMoveEligible({ ...base, deadSeatedCount: 3 })).toBe(false);
  });

  it("does not grant when the night produced no kill", () => {
    // Mafia disagreed, or one abstained → no victim, so nothing to grant.
    expect(isBestMoveEligible({ ...base, killedSeatCount: 0 })).toBe(false);
  });

  it("does not grant on night 2 or later — first night only", () => {
    expect(isBestMoveEligible({ ...base, nightNumber: 2 })).toBe(false);
    expect(isBestMoveEligible({ ...base, nightNumber: 5 })).toBe(false);
  });

  it("does not grant before any night has been played", () => {
    expect(isBestMoveEligible({ ...base, nightNumber: 0 })).toBe(false);
  });
});

describe("isBestMoveComplete (§6.2)", () => {
  it("is incomplete below the suspect count", () => {
    expect(isBestMoveComplete([])).toBe(false);
    expect(isBestMoveComplete([3])).toBe(false);
    expect(isBestMoveComplete([3, 7])).toBe(false);
  });

  it("is complete at exactly the suspect count — the locking signal", () => {
    expect(isBestMoveComplete([3, 7, 9])).toBe(true);
  });

  it("uses the shared constant, so the cap has one home", () => {
    expect(SPORTS.BEST_MOVE_SUSPECT_COUNT).toBe(3);
    expect(
      isBestMoveComplete(
        Array.from({ length: SPORTS.BEST_MOVE_SUSPECT_COUNT }, (_, i) => i + 1),
      ),
    ).toBe(true);
  });
});

describe("best_move in the Sports phase graph (§6.4)", () => {
  it("sits between the last night check and the farewell", () => {
    const i = SPORTS_PHASES.indexOf("best_move");
    expect(i).toBeGreaterThan(
      SPORTS_PHASES.indexOf("detective_checks_for_mafia"),
    );
    expect(i).toBeLessThan(SPORTS_PHASES.indexOf("farewell_speech"));
  });

  it("always advances to farewell_speech (a deterministic edge)", () => {
    expect(sportsNextPhase("best_move")).toBe("farewell_speech");
  });

  it("is flagged on Sports and absent from Japanese", () => {
    expect(SPORTS_DEFINITION.flags.hasBestMove).toBe(true);
    expect(JAPANESE_DEFINITION.flags.hasBestMove).toBe(false);
  });

  it("is not a Japanese phase", () => {
    expect(JAPANESE_DEFINITION.phases).not.toContain("best_move");
  });
});
