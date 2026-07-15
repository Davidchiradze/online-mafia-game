import { describe, it, expect } from "vitest";
import { getUiRuleset } from "@/game/registry";
import { JAPANESE_UI_RULESET } from "@/game/japanese/ruleset";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
} from "@/lib/game/visibility";

/**
 * CHARACTERIZATION TEST — the frontend UI ruleset registry (P1-T8).
 *
 * Pins that `getUiRuleset` resolves the Japanese ruleset and that the Japanese
 * ruleset WRAPS the current shared implementations by reference (so behavior is
 * unchanged — the real behavior stays pinned by visibility.test.ts /
 * phaseFlow.test.ts). When the visibility chains physically move into
 * `src/game/japanese/visibility.ts`, only the wrapped imports change.
 */

describe("getUiRuleset", () => {
  it("resolves japanese_mafia to the Japanese ruleset", () => {
    expect(getUiRuleset("japanese_mafia")).toBe(JAPANESE_UI_RULESET);
  });

  it("falls back to Japanese while the game type is still loading", () => {
    expect(getUiRuleset(null)).toBe(JAPANESE_UI_RULESET);
    expect(getUiRuleset(undefined)).toBe(JAPANESE_UI_RULESET);
  });

  it("falls back to Japanese for an unregistered type (Phase 1)", () => {
    expect(getUiRuleset("sports_mafia")).toBe(JAPANESE_UI_RULESET);
  });
});

describe("JAPANESE_UI_RULESET.visibility — wraps the shared lib by reference", () => {
  const { visibility } = JAPANESE_UI_RULESET;

  it("re-exports the exact shared visibility functions", () => {
    expect(visibility.canSeeParticipant).toBe(canSeeParticipant);
    expect(visibility.getAwakeRoles).toBe(getAwakeRoles);
    expect(visibility.isNightActivityPhase).toBe(isNightActivityPhase);
    expect(visibility.getVisibilityState).toBe(getVisibilityState);
    expect(visibility.getVisibilityStateWithDeath).toBe(
      getVisibilityStateWithDeath,
    );
  });

  it("answers awake-roles and night-phase questions identically", () => {
    expect(visibility.getAwakeRoles("mafia_meet")).toEqual([
      "DON",
      "MAFIA",
      "MAFIA_RIGHT_HAND",
    ]);
    expect(visibility.isNightActivityPhase("night_phase")).toBe(true);
    expect(visibility.isNightActivityPhase("day_phase")).toBe(false);
  });
});

describe("JAPANESE_UI_RULESET.advanceUpdates — wraps phaseFlow", () => {
  it("is the shared advanceUpdates helper", () => {
    expect(JAPANESE_UI_RULESET.advanceUpdates).toBe(advanceUpdates);
  });

  it("produces the host-advance payload for a phase", () => {
    expect(JAPANESE_UI_RULESET.advanceUpdates("mafia_meet")).toEqual({
      gamePhase: "don_chooses_right_hand",
    });
  });
});
