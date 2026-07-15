import { describe, it, expect } from "vitest";
import { getUiRuleset } from "@/game/registry";
import { JAPANESE_UI_RULESET } from "@/game/japanese/ruleset";
import { SPORTS_UI_RULESET } from "@/game/sports/ruleset";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import { sportsAdvanceUpdates } from "@/game/sports/phaseFlow";
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

  // Phase 4 (P4-T2) registers Sports → dispatch is now strict. (This assertion
  // replaces the Phase-1 "sports falls back to Japanese" placeholder; the
  // registry doc anticipated the flip once other variants ship their rulesets.)
  it("resolves sports_mafia to the Sports ruleset (P4-T2)", () => {
    expect(getUiRuleset("sports_mafia")).toBe(SPORTS_UI_RULESET);
  });

  it("still falls back to Japanese for a genuinely unknown type", () => {
    expect(getUiRuleset("city_mafia")).toBe(JAPANESE_UI_RULESET);
  });
});

describe("phaseControls maps", () => {
  it("Japanese covers every live phase incl. the yakuza/doctor branches", () => {
    const keys = Object.keys(JAPANESE_UI_RULESET.phaseControls);
    for (const phase of [
      "game_session_started",
      "picking_roles",
      "mafia_meet",
      "don_chooses_right_hand",
      "yakuda_shogun_meet",
      "detective_meet",
      "doctor_meet",
      "introduction_phase",
      "night_phase",
      "mafia_chooses_target",
      "don_checks_for_detective",
      "right_hand_checks_for_yakuza",
      "yakuza_and_shogun_chooses_target",
      "detective_checks_for_mafia",
      "doctor_heals_player",
      "farewell_speech",
      "day_phase",
      "nominated_players_speak",
      "voting",
      "repeat",
      "end_game",
      "phase_transition",
    ]) {
      expect(keys).toContain(phase);
    }
  });

  it("Sports covers its phases and drops the yakuza/doctor/right-hand ones", () => {
    const controls = SPORTS_UI_RULESET.phaseControls;
    for (const phase of [
      "game_session_started",
      "picking_roles",
      "mafia_meet",
      "detective_meet",
      "day_phase",
      "nominated_players_speak",
      "voting",
      "night_phase",
      "mafia_chooses_target",
      "don_checks_for_detective",
      "detective_checks_for_mafia",
      "farewell_speech",
      "repeat",
      "end_game",
      "phase_transition",
    ]) {
      expect(controls[phase]).toBeTypeOf("function");
    }
    for (const dropped of [
      "don_chooses_right_hand",
      "yakuda_shogun_meet",
      "doctor_meet",
      "introduction_phase",
      "right_hand_checks_for_yakuza",
      "yakuza_and_shogun_chooses_target",
      "doctor_heals_player",
    ]) {
      expect(controls[dropped]).toBeUndefined();
    }
  });
});

describe("SPORTS_UI_RULESET", () => {
  it("uses the Sports host-advance flow", () => {
    expect(SPORTS_UI_RULESET.advanceUpdates).toBe(sportsAdvanceUpdates);
  });

  it("has its own visibility + night-authority (P4-T3)", () => {
    // Video visibility wraps the same shared fns as Japanese (subset roles),
    // but the ruleset object is distinct and carries the Sports night model.
    expect(SPORTS_UI_RULESET.visibility.getAwakeRoles).toBe(
      JAPANESE_UI_RULESET.visibility.getAwakeRoles,
    );
    expect(SPORTS_UI_RULESET.nightAuthority).not.toBe(
      JAPANESE_UI_RULESET.nightAuthority,
    );
  });

  it("declares the unanimous-vote mafia night model (§5.4)", () => {
    expect(SPORTS_UI_RULESET.mafiaNightModel).toBe("unanimous-vote");
    expect(JAPANESE_UI_RULESET.mafiaNightModel).toBe("single-authority");
  });

  it("routes the last night check through the buffer as the resolve-marker", () => {
    // detective_checks_for_mafia parks in phase_transition with nextPhase =
    // farewell_speech, which StartNextPhaseButton turns into startFarewellSpeech.
    expect(sportsAdvanceUpdates("detective_checks_for_mafia")).toEqual({
      gamePhase: "phase_transition",
      nextPhase: "farewell_speech",
    });
  });

  it("advances the mafia-meet to the detective-meet (not the Japanese target)", () => {
    expect(sportsAdvanceUpdates("mafia_meet")).toEqual({
      gamePhase: "phase_transition",
      nextPhase: "detective_meet",
    });
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
