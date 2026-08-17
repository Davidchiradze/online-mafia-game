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
import { GamePhase } from "@/shared/lib/constants/game";

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
      GamePhase.GAME_SESSION_STARTED,
      GamePhase.PICKING_ROLES,
      GamePhase.MAFIA_MEET,
      GamePhase.YAKUDA_SHOGUN_MEET,
      GamePhase.DETECTIVE_MEET,
      GamePhase.DOCTOR_MEET,
      GamePhase.INTRODUCTION_PHASE,
      GamePhase.NIGHT_PHASE,
      GamePhase.MAFIA_CHOOSES_TARGET,
      GamePhase.DON_CHECKS_FOR_DETECTIVE,
      GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
      GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
      GamePhase.DOCTOR_HEALS_PLAYER,
      GamePhase.FAREWELL_SPEECH,
      GamePhase.DAY_PHASE,
      GamePhase.NOMINATED_PLAYERS_SPEAK,
      GamePhase.VOTING,
      GamePhase.REPEAT,
      GamePhase.END_GAME,
      GamePhase.PHASE_TRANSITION,
    ]) {
      expect(keys).toContain(phase);
    }
  });

  it("Sports covers its phases and drops the yakuza/doctor/right-hand ones", () => {
    const controls = SPORTS_UI_RULESET.phaseControls;
    for (const phase of [
      GamePhase.GAME_SESSION_STARTED,
      GamePhase.PICKING_ROLES,
      GamePhase.MAFIA_MEET,
      GamePhase.DON_MEET,
      GamePhase.DETECTIVE_MEET,
      GamePhase.DAY_PHASE,
      GamePhase.NOMINATED_PLAYERS_SPEAK,
      GamePhase.VOTING,
      GamePhase.NIGHT_PHASE,
      GamePhase.MAFIA_CHOOSES_TARGET,
      GamePhase.DON_CHECKS_FOR_DETECTIVE,
      GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
      GamePhase.BEST_MOVE,
      GamePhase.FAREWELL_SPEECH,
      GamePhase.REPEAT,
      GamePhase.END_GAME,
      GamePhase.PHASE_TRANSITION,
    ]) {
      expect(controls[phase]).toBeTypeOf("function");
    }
    for (const dropped of [
      GamePhase.YAKUDA_SHOGUN_MEET,
      GamePhase.DOCTOR_MEET,
      GamePhase.INTRODUCTION_PHASE,
      GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
      GamePhase.DOCTOR_HEALS_PLAYER,
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
      sports.canSeeParticipant("DON", "MAFIA", GamePhase.MAFIA_CHOOSES_TARGET, false, false),
    ).toBe(false);
    expect(
      sports.canSeeParticipant("MAFIA", "CITIZEN", GamePhase.MAFIA_CHOOSES_TARGET, false, false),
    ).toBe(false);
    expect(
      sports.canSeeParticipant(null, "MAFIA", GamePhase.MAFIA_CHOOSES_TARGET, true, false),
    ).toBe(true); // host still monitors

    // But mafia DO meet face-to-face at mafia_meet.
    expect(
      sports.canSeeParticipant("DON", "MAFIA", GamePhase.MAFIA_MEET, false, false),
    ).toBe(true);

    // Awake roles are the Sports set (no yakuza/doctor/right-hand); mafia are
    // still "awake" at mafia_chooses_target so they see the 5s countdown badge.
    expect(sports.getAwakeRoles(GamePhase.MAFIA_CHOOSES_TARGET)).toEqual(["DON", "MAFIA"]);
    expect(sports.getAwakeRoles(GamePhase.DETECTIVE_CHECKS_FOR_MAFIA)).toEqual(["DETECTIVE"]);
  });

  it("declares the unanimous-vote mafia night model (§5.4)", () => {
    expect(SPORTS_UI_RULESET.mafiaNightModel).toBe("unanimous-vote");
    expect(JAPANESE_UI_RULESET.mafiaNightModel).toBe("single-authority");
  });

  it("routes the last night check through the buffer as the resolve-marker", () => {
    // detective_checks_for_mafia parks in phase_transition with nextPhase =
    // farewell_speech, which StartNextPhaseButton turns into startFarewellSpeech.
    expect(sportsAdvanceUpdates(GamePhase.DETECTIVE_CHECKS_FOR_MAFIA)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.FAREWELL_SPEECH,
    });
  });

  it("advances the mafia-meet to the Don's solo meet (not the Japanese target)", () => {
    expect(sportsAdvanceUpdates(GamePhase.MAFIA_MEET)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.DON_MEET,
    });
  });

  it("advances the don-meet to the detective-meet", () => {
    expect(sportsAdvanceUpdates(GamePhase.DON_MEET)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.DETECTIVE_MEET,
    });
  });

  // -------------------------------------------------------------------------
  // Best move (docs/variants/sports/rules.md §6)
  // -------------------------------------------------------------------------

  it("advances best_move straight to the farewell — NO sleep buffer", () => {
    // It is already dawn and everyone is awake, so parking in the neutral
    // "everyone asleep" buffer would be wrong. This edge is also the host's
    // always-enabled Skip (§6.3) — the deadlock guard.
    expect(sportsAdvanceUpdates(GamePhase.BEST_MOVE)).toEqual({
      gamePhase: GamePhase.FAREWELL_SPEECH,
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
          visibility.canSeeParticipant(role, "DON", GamePhase.BEST_MOVE, false, false),
        ).toBe(false);
      }
      expect(
        visibility.canSeeParticipant(null, "DON", GamePhase.BEST_MOVE, true, false),
      ).toBe(true);
    });

    it("behaves as a night phase with nobody awake by role", () => {
      expect(visibility.isNightActivityPhase(GamePhase.BEST_MOVE)).toBe(true);
      expect(visibility.getAwakeRoles(GamePhase.BEST_MOVE)).toEqual([]);
    });

    it("shows the host the sleeping table, and covers it for players", () => {
      expect(
        visibility.getVisibilityState(null, "CITIZEN", GamePhase.BEST_MOVE, true, false),
      ).toBe(VisibilityState.DIMMED);
      expect(
        visibility.getVisibilityState(
          "CITIZEN",
          "DON",
          GamePhase.BEST_MOVE,
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
    expect(visibility.getAwakeRoles(GamePhase.MAFIA_MEET)).toEqual([
      "DON",
      "MAFIA",
    ]);
    expect(visibility.isNightActivityPhase(GamePhase.NIGHT_PHASE)).toBe(true);
    expect(visibility.isNightActivityPhase(GamePhase.DAY_PHASE)).toBe(false);
  });
});

describe("JAPANESE_UI_RULESET.advanceUpdates — wraps phaseFlow", () => {
  it("is the shared advanceUpdates helper", () => {
    expect(JAPANESE_UI_RULESET.advanceUpdates).toBe(advanceUpdates);
  });

  it("produces the host-advance payload for a phase", () => {
    expect(JAPANESE_UI_RULESET.advanceUpdates(GamePhase.MAFIA_MEET)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.YAKUDA_SHOGUN_MEET,
    });
  });
});
