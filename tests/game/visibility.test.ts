import { describe, it, expect } from "vitest";
import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
  VisibilityState,
  type GamePhase,
  type Role,
} from "@/lib/game/visibility";
import { GAME_PHASES } from "@/lib/constants/game";

/**
 * CHARACTERIZATION TEST — Japanese role/phase visibility (regression oracle).
 *
 * Pins who can see whom, which roles are awake, and which phases are "night".
 * During the refactor this becomes the variant's `VisibilityRuleset`
 * (docs/game-types.md §2.4); the Japanese answers must not change.
 */

const ALL_ROLES: Role[] = [
  "DON",
  "MAFIA",
  "MAFIA_RIGHT_HAND",
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
    "game_session_started",
    "introduction_phase",
    "day_phase",
    "nominated_players_speak",
    "voting",
    "farewell_speech",
    "repeat", // hits the default `return true`
    "end_game", // hits the default `return true`
  ];

  it.each(openPhases)("everyone (incl. non-host) can see during %s", (phase) => {
    for (const role of ALL_ROLES) {
      expect(canSee(phase, role, false)).toBe(true);
    }
    expect(canSee(phase, null, true)).toBe(true); // host too
  });
});

describe("canSeeParticipant — host-only phases", () => {
  it.each(["picking_roles", "phase_transition"] as const)(
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
      expect(canSee("night_phase", role, false)).toBe(false);
    }
    expect(canSee("night_phase", null, true)).toBe(false);
  });
});

describe("canSeeParticipant — awake-role phases", () => {
  // phase → the roles that can see during it (everyone else sees nothing)
  const awakePhases: Array<[GamePhase, Role[]]> = [
    ["mafia_meet", ["DON", "MAFIA", "MAFIA_RIGHT_HAND"]],
    ["don_chooses_right_hand", ["DON", "MAFIA", "MAFIA_RIGHT_HAND"]],
    ["mafia_chooses_target", ["DON", "MAFIA", "MAFIA_RIGHT_HAND"]],
    ["yakuda_shogun_meet", ["YAKUZA", "SHOGUN"]],
    ["yakuza_and_shogun_chooses_target", ["YAKUZA", "SHOGUN"]],
    ["detective_meet", ["DETECTIVE"]],
    ["detective_checks_for_mafia", ["DETECTIVE"]],
    ["doctor_meet", ["DOCTOR"]],
    ["doctor_heals_player", ["DOCTOR"]],
    ["don_checks_for_detective", ["DON"]],
    ["right_hand_checks_for_yakuza", ["MAFIA_RIGHT_HAND"]],
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
    ["mafia_meet", ["DON", "MAFIA", "MAFIA_RIGHT_HAND"]],
    ["mafia_chooses_target", ["DON", "MAFIA", "MAFIA_RIGHT_HAND"]],
    ["don_chooses_right_hand", ["DON", "MAFIA", "MAFIA_RIGHT_HAND"]],
    ["don_checks_for_detective", ["DON"]],
    ["yakuda_shogun_meet", ["YAKUZA", "SHOGUN"]],
    ["yakuza_and_shogun_chooses_target", ["YAKUZA", "SHOGUN"]],
    ["detective_meet", ["DETECTIVE"]],
    ["detective_checks_for_mafia", ["DETECTIVE"]],
    ["doctor_meet", ["DOCTOR"]],
    ["doctor_heals_player", ["DOCTOR"]],
    ["right_hand_checks_for_yakuza", ["MAFIA_RIGHT_HAND"]],
  ];

  it.each(awake)("%s → %j", (phase, roles) => {
    expect(getAwakeRoles(phase)).toEqual(roles);
  });

  const noAwakePhases: GamePhase[] = [
    "game_session_started",
    "picking_roles",
    "night_phase",
    "introduction_phase",
    "phase_transition",
    "farewell_speech",
    "day_phase",
    "nominated_players_speak",
    "voting",
    "repeat",
    "end_game",
  ];

  it.each(noAwakePhases)("%s has no awake roles", (phase) => {
    expect(getAwakeRoles(phase)).toEqual([]);
  });
});

describe("isNightActivityPhase", () => {
  // The canonical night set. Derived here so the parametrized check below also
  // guards against any phase silently changing category.
  const NIGHT_PHASES = new Set<GamePhase>([
    "picking_roles",
    "night_phase",
    "phase_transition",
    "mafia_meet",
    "don_chooses_right_hand",
    "yakuda_shogun_meet",
    "detective_meet",
    "doctor_meet",
    "mafia_chooses_target",
    "don_checks_for_detective",
    "right_hand_checks_for_yakuza",
    "yakuza_and_shogun_chooses_target",
    "detective_checks_for_mafia",
    "doctor_heals_player",
  ]);

  it.each(GAME_PHASES)(
    "%s is classified consistently with the night set",
    (phase) => {
      expect(isNightActivityPhase(phase)).toBe(NIGHT_PHASES.has(phase));
    },
  );

  it("counts phase_transition as a night phase", () => {
    expect(isNightActivityPhase("phase_transition")).toBe(true);
  });

  it("does not count day_phase as a night phase", () => {
    expect(isNightActivityPhase("day_phase")).toBe(false);
  });
});

describe("getVisibilityState — granular night dimming", () => {
  it("returns COVERED when the viewer cannot see the target", () => {
    // CITIZEN during mafia_meet sees no one.
    expect(
      getVisibilityState("CITIZEN", "DON", "mafia_meet", false, false),
    ).toBe(VisibilityState.COVERED);
  });

  it("shows an awake teammate as VISIBLE during a night phase", () => {
    // DON sees MAFIA (both awake) fully during mafia_meet.
    expect(
      getVisibilityState("DON", "MAFIA", "mafia_meet", false, false),
    ).toBe(VisibilityState.VISIBLE);
  });

  it("DIMs a sleeping target the awake viewer is allowed to see", () => {
    // DON sees a sleeping CITIZEN dimmed during mafia_meet.
    expect(
      getVisibilityState("DON", "CITIZEN", "mafia_meet", false, false),
    ).toBe(VisibilityState.DIMMED);
  });

  it("DIMs everyone during picking_roles for the host", () => {
    expect(
      getVisibilityState(null, "CITIZEN", "picking_roles", true, false),
    ).toBe(VisibilityState.DIMMED);
  });

  it("keeps the host tile VISIBLE to itself during a night phase", () => {
    expect(
      getVisibilityState(null, null, "mafia_meet", true, true),
    ).toBe(VisibilityState.VISIBLE);
  });

  it("returns COVERED at night_phase even for the host (nobody sees)", () => {
    expect(
      getVisibilityState(null, "CITIZEN", "night_phase", true, false),
    ).toBe(VisibilityState.COVERED);
  });

  it("returns VISIBLE for a normal day phase", () => {
    expect(
      getVisibilityState("CITIZEN", "CITIZEN", "day_phase", false, false),
    ).toBe(VisibilityState.VISIBLE);
  });
});

describe("getVisibilityStateWithDeath — death layering", () => {
  it("reveals everyone once the game is finished", () => {
    expect(
      getVisibilityStateWithDeath(
        "CITIZEN", "DON", "mafia_meet", false, false, true, true, true,
      ),
    ).toBe(VisibilityState.VISIBLE);
  });

  it("shows a dead non-host target as DEAD regardless of phase", () => {
    expect(
      getVisibilityStateWithDeath(
        "DON", "MAFIA", "mafia_meet", false, false, true, false, false,
      ),
    ).toBe(VisibilityState.DEAD);
  });

  it("covers everything for a dead viewer during a night phase", () => {
    expect(
      getVisibilityStateWithDeath(
        "CITIZEN", "DON", "mafia_meet", false, false, false, true, false,
      ),
    ).toBe(VisibilityState.COVERED);
  });

  it("delegates to the standard logic for living players in the day", () => {
    expect(
      getVisibilityStateWithDeath(
        "CITIZEN", "CITIZEN", "day_phase", false, false, true, true, false,
      ),
    ).toBe(VisibilityState.VISIBLE);
  });
});
