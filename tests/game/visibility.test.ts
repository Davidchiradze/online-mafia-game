import { describe, it, expect } from "vitest";
import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
  VisibilityState,
  GamePhase,
  type Role,
} from "@/shared/lib/game/visibility";
import { GAME_PHASES } from "@/shared/lib/constants/game";

/**
 * CHARACTERIZATION TEST — Japanese role/phase visibility (regression oracle).
 *
 * Pins who can see whom, which roles are awake, and which phases are "night".
 * During the refactor this becomes the variant's `VisibilityRuleset`
 * (docs/engine/variant-architecture.md §2.4); the Japanese answers must not change.
 */

const ALL_ROLES: Role[] = [
  "DON",
  "MAFIA",
  "YAKUZA",
  "SHOGUN",
  "DETECTIVE",
  "DOCTOR",
  "CITIZEN",
  null,
];

// targetRole is unused by canSeeParticipant; fix target as a non-host player.
const canSee = (
  phase: GamePhase | null,
  viewerRole: Role,
  isViewerHost = false,
  isTargetHost = false,
): boolean => canSeeParticipant(viewerRole, null, phase, isViewerHost, isTargetHost);

describe("canSeeParticipant — everyone-visible phases", () => {
  const openPhases: Array<GamePhase | null> = [
    null, // no session yet
    GamePhase.GAME_SESSION_STARTED,
    GamePhase.INTRODUCTION_PHASE,
    GamePhase.DAY_PHASE,
    GamePhase.NOMINATED_PLAYERS_SPEAK,
    GamePhase.VOTING,
    GamePhase.FAREWELL_SPEECH,
    GamePhase.REPEAT, // hits the default `return true`
    GamePhase.END_GAME, // hits the default `return true`
  ];

  it.each(openPhases)("everyone (incl. non-host) can see during %s", (phase) => {
    for (const role of ALL_ROLES) {
      expect(canSee(phase, role, false)).toBe(true);
    }
    expect(canSee(phase, null, true)).toBe(true); // host too
  });
});

describe("canSeeParticipant — host-only phases", () => {
  it.each([GamePhase.PICKING_ROLES, GamePhase.PHASE_TRANSITION] as const)(
    "only the host can see during %s",
    (phase) => {
      expect(canSee(phase, null, true)).toBe(true);
      for (const role of ALL_ROLES) {
        expect(canSee(phase, role, false)).toBe(false);
      }
    },
  );
});

describe("canSeeParticipant — full darkness", () => {
  it("nobody sees anyone during night_phase, not even the host", () => {
    for (const role of ALL_ROLES) {
      expect(canSee(GamePhase.NIGHT_PHASE, role, false)).toBe(false);
    }
    expect(canSee(GamePhase.NIGHT_PHASE, null, true)).toBe(false);
  });
});

describe("canSeeParticipant — awake-role phases", () => {
  // phase → the roles that can see during it (everyone else sees nothing)
  const awakePhases: Array<[GamePhase, Role[]]> = [
    [GamePhase.MAFIA_MEET, ["DON", "MAFIA"]],
    [GamePhase.MAFIA_CHOOSES_TARGET, ["DON", "MAFIA"]],
    [GamePhase.YAKUDA_SHOGUN_MEET, ["YAKUZA", "SHOGUN"]],
    [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET, ["YAKUZA", "SHOGUN"]],
    [GamePhase.DETECTIVE_MEET, ["DETECTIVE"]],
    [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA, ["DETECTIVE"]],
    [GamePhase.DOCTOR_MEET, ["DOCTOR"]],
    [GamePhase.DOCTOR_HEALS_PLAYER, ["DOCTOR"]],
    [GamePhase.DON_CHECKS_FOR_DETECTIVE, ["DON"]],
    [GamePhase.DON_MEET, ["DON"]],
  ];

  it.each(awakePhases)(
    "during %s only %j (and the host) can see",
    (phase, awake) => {
      expect(canSee(phase, null, true)).toBe(true); // host always sees
      for (const role of ALL_ROLES) {
        expect(canSee(phase, role, false)).toBe(awake.includes(role));
      }
    },
  );
});

describe("getAwakeRoles", () => {
  const awake: Array<[GamePhase, Role[]]> = [
    [GamePhase.MAFIA_MEET, ["DON", "MAFIA"]],
    [GamePhase.MAFIA_CHOOSES_TARGET, ["DON", "MAFIA"]],
    [GamePhase.DON_MEET, ["DON"]],
    [GamePhase.DON_CHECKS_FOR_DETECTIVE, ["DON"]],
    [GamePhase.YAKUDA_SHOGUN_MEET, ["YAKUZA", "SHOGUN"]],
    [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET, ["YAKUZA", "SHOGUN"]],
    [GamePhase.DETECTIVE_MEET, ["DETECTIVE"]],
    [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA, ["DETECTIVE"]],
    [GamePhase.DOCTOR_MEET, ["DOCTOR"]],
    [GamePhase.DOCTOR_HEALS_PLAYER, ["DOCTOR"]],
  ];

  it.each(awake)("%s → %j", (phase, roles) => {
    expect(getAwakeRoles(phase)).toEqual(roles);
  });

  const noAwakePhases: GamePhase[] = [
    GamePhase.GAME_SESSION_STARTED,
    GamePhase.PICKING_ROLES,
    GamePhase.NIGHT_PHASE,
    GamePhase.INTRODUCTION_PHASE,
    GamePhase.PHASE_TRANSITION,
    GamePhase.FAREWELL_SPEECH,
    GamePhase.DAY_PHASE,
    GamePhase.NOMINATED_PLAYERS_SPEAK,
    GamePhase.VOTING,
    GamePhase.REPEAT,
    GamePhase.END_GAME,
  ];

  it.each(noAwakePhases)("%s has no awake roles", (phase) => {
    expect(getAwakeRoles(phase)).toEqual([]);
  });
});

describe("isNightActivityPhase", () => {
  // The canonical night set. Derived here so the parametrized check below also
  // guards against any phase silently changing category.
  const NIGHT_PHASES = new Set<GamePhase>([
    GamePhase.PICKING_ROLES,
    GamePhase.NIGHT_PHASE,
    GamePhase.PHASE_TRANSITION,
    GamePhase.MAFIA_MEET,
    GamePhase.DON_MEET,
    GamePhase.YAKUDA_SHOGUN_MEET,
    GamePhase.DETECTIVE_MEET,
    GamePhase.DOCTOR_MEET,
    GamePhase.MAFIA_CHOOSES_TARGET,
    GamePhase.DON_CHECKS_FOR_DETECTIVE,
    GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
    GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
    GamePhase.DOCTOR_HEALS_PLAYER,
  ]);

  it.each(GAME_PHASES)(
    "%s is classified consistently with the night set",
    (phase) => {
      expect(isNightActivityPhase(phase)).toBe(NIGHT_PHASES.has(phase));
    },
  );

  it("counts phase_transition as a night phase", () => {
    expect(isNightActivityPhase(GamePhase.PHASE_TRANSITION)).toBe(true);
  });

  it("does not count day_phase as a night phase", () => {
    expect(isNightActivityPhase(GamePhase.DAY_PHASE)).toBe(false);
  });
});

describe("getVisibilityState — granular night dimming", () => {
  it("returns COVERED when the viewer cannot see the target", () => {
    // CITIZEN during mafia_meet sees no one.
    expect(
      getVisibilityState("CITIZEN", "DON", GamePhase.MAFIA_MEET, false, false),
    ).toBe(VisibilityState.COVERED);
  });

  it("shows an awake teammate as VISIBLE during a night phase", () => {
    // DON sees MAFIA (both awake) fully during mafia_meet.
    expect(
      getVisibilityState("DON", "MAFIA", GamePhase.MAFIA_MEET, false, false),
    ).toBe(VisibilityState.VISIBLE);
  });

  it("DIMs a sleeping target the awake viewer is allowed to see", () => {
    // DON sees a sleeping CITIZEN dimmed during mafia_meet.
    expect(
      getVisibilityState("DON", "CITIZEN", GamePhase.MAFIA_MEET, false, false),
    ).toBe(VisibilityState.DIMMED);
  });

  it("DIMs everyone during picking_roles for the host", () => {
    expect(
      getVisibilityState(null, "CITIZEN", GamePhase.PICKING_ROLES, true, false),
    ).toBe(VisibilityState.DIMMED);
  });

  it("keeps the host tile VISIBLE to itself during a night phase", () => {
    expect(
      getVisibilityState(null, null, GamePhase.MAFIA_MEET, true, true),
    ).toBe(VisibilityState.VISIBLE);
  });

  it("returns COVERED at night_phase even for the host (nobody sees)", () => {
    expect(
      getVisibilityState(null, "CITIZEN", GamePhase.NIGHT_PHASE, true, false),
    ).toBe(VisibilityState.COVERED);
  });

  it("returns VISIBLE for a normal day phase", () => {
    expect(
      getVisibilityState("CITIZEN", "CITIZEN", GamePhase.DAY_PHASE, false, false),
    ).toBe(VisibilityState.VISIBLE);
  });
});

describe("getVisibilityStateWithDeath — death layering", () => {
  it("reveals everyone once the game is finished", () => {
    expect(
      getVisibilityStateWithDeath(
        "CITIZEN", "DON", GamePhase.MAFIA_MEET, false, false, true, true, true,
      ),
    ).toBe(VisibilityState.VISIBLE);
  });

  it("shows a dead non-host target as DEAD regardless of phase", () => {
    expect(
      getVisibilityStateWithDeath(
        "DON", "MAFIA", GamePhase.MAFIA_MEET, false, false, true, false, false,
      ),
    ).toBe(VisibilityState.DEAD);
  });

  it("covers everything for a dead viewer during a night phase", () => {
    expect(
      getVisibilityStateWithDeath(
        "CITIZEN", "DON", GamePhase.MAFIA_MEET, false, false, false, true, false,
      ),
    ).toBe(VisibilityState.COVERED);
  });

  it("delegates to the standard logic for living players in the day", () => {
    expect(
      getVisibilityStateWithDeath(
        "CITIZEN", "CITIZEN", GamePhase.DAY_PHASE, false, false, true, true, false,
      ),
    ).toBe(VisibilityState.VISIBLE);
  });
});
