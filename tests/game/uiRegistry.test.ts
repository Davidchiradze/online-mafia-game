import { describe, it, expect } from "vitest";
import { getUiRuleset } from "@/features/game-room/variants/registry";
import { JAPANESE_UI_RULESET } from "@/features/game-room/variants/japanese/ruleset";
import { SPORTS_UI_RULESET } from "@/features/game-room/variants/sports/ruleset";
import { advanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";
import { sportsAdvanceUpdates } from "@/features/game-room/variants/sports/phaseFlow";
import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
  VisibilityState,
} from "@/shared/lib/game/visibility";

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
      "don_meet",
      "detective_meet",
      "day_phase",
      "nominated_players_speak",
      "voting",
      "night_phase",
      "mafia_chooses_target",
      "don_checks_for_detective",
      "detective_checks_for_mafia",
      "best_move",
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
    // Sports now ships a REAL, distinct visibility ruleset — no longer the
    // interim Japanese re-export — with Sports-specific phase+role rules.
    const sports = SPORTS_UI_RULESET.visibility;
    expect(sports.getAwakeRoles).not.toBe(
      JAPANESE_UI_RULESET.visibility.getAwakeRoles,
    );
    expect(SPORTS_UI_RULESET.nightAuthority).not.toBe(
      JAPANESE_UI_RULESET.nightAuthority,
    );

    // mafia_chooses_target is PRIVATE: the acting mafia see NO video (every
    // tile covered), only the host monitors. Contrast Japanese, where mafia
    // see each other + the table during this phase.
    expect(
      sports.canSeeParticipant("DON", "MAFIA", "mafia_chooses_target", false, false),
    ).toBe(false);
    expect(
      sports.canSeeParticipant("MAFIA", "CITIZEN", "mafia_chooses_target", false, false),
    ).toBe(false);
    expect(
      sports.canSeeParticipant(null, "MAFIA", "mafia_chooses_target", true, false),
    ).toBe(true); // host still monitors

    // But mafia DO meet face-to-face at mafia_meet.
    expect(
      sports.canSeeParticipant("DON", "MAFIA", "mafia_meet", false, false),
    ).toBe(true);

    // Awake roles are the Sports set (no yakuza/doctor/right-hand); mafia are
    // still "awake" at mafia_chooses_target so they see the 5s countdown badge.
    expect(sports.getAwakeRoles("mafia_chooses_target")).toEqual(["DON", "MAFIA"]);
    expect(sports.getAwakeRoles("detective_checks_for_mafia")).toEqual(["DETECTIVE"]);
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

  it("advances the mafia-meet to the Don's solo meet (not the Japanese target)", () => {
    expect(sportsAdvanceUpdates("mafia_meet")).toEqual({
      gamePhase: "phase_transition",
      nextPhase: "don_meet",
    });
  });

  it("advances the don-meet to the detective-meet", () => {
    expect(sportsAdvanceUpdates("don_meet")).toEqual({
      gamePhase: "phase_transition",
      nextPhase: "detective_meet",
    });
  });

  // -------------------------------------------------------------------------
  // Best move (docs/variants/sports.md §6)
  // -------------------------------------------------------------------------

  it("advances best_move straight to the farewell — NO sleep buffer", () => {
    // It is already dawn and everyone is awake, so parking in the neutral
    // "everyone asleep" buffer would be wrong. This edge is also the host's
    // always-enabled Skip (§6.3) — the deadlock guard.
    expect(sportsAdvanceUpdates("best_move")).toEqual({
      gamePhase: "farewell_speech",
    });
  });

  // During best_move EVERYONE sleeps — including the killed player who is
  // picking. Only the host sees the players. Same shape as mafia_chooses_target:
  // the actor's buttons render above the covers.
  describe("best_move visibility (§6.6)", () => {
    const { visibility } = SPORTS_UI_RULESET;

    it("keeps every player asleep — only the host sees", () => {
      for (const role of ["DON", "MAFIA", "DETECTIVE", "CITIZEN"] as const) {
        expect(
          visibility.canSeeParticipant(role, "DON", "best_move", false, false),
        ).toBe(false);
      }
      expect(
        visibility.canSeeParticipant(null, "DON", "best_move", true, false),
      ).toBe(true);
    });

    it("behaves as a night phase with nobody awake by role", () => {
      expect(visibility.isNightActivityPhase("best_move")).toBe(true);
      expect(visibility.getAwakeRoles("best_move")).toEqual([]);
    });

    it("shows the host the sleeping table, and covers it for players", () => {
      expect(
        visibility.getVisibilityState(null, "CITIZEN", "best_move", true, false),
      ).toBe(VisibilityState.DIMMED);
      expect(
        visibility.getVisibilityState(
          "CITIZEN",
          "DON",
          "best_move",
          false,
          false,
        ),
      ).toBe(VisibilityState.COVERED);
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
