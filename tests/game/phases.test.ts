import { describe, it, expect } from "vitest";
import {
  GAME_PHASES as SRC_GAME_PHASES,
  JAPANESE_MAFIA_ROLES,
} from "@/shared/lib/constants/game";
import {
  GAME_PHASES as CONVEX_GAME_PHASES,
  JAPANESE_MAFIA_ROLE_DISTRIBUTION,
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "@convex/lib/constants";

/**
 * CHARACTERIZATION TEST — Japanese phase order, role set, and deck.
 *
 * These are the "phases / roles / deck / factions" that become variant-specific
 * (`definition.phases`, `definition.roles`, `definition.roleDistribution`) in the
 * refactor (docs/game-types.md §2.1, §4). Pinning the current Japanese values
 * makes any consolidation a deliberate, visible diff — and guards the guardrail
 * "phases by name, never by index" by locking the exact ordering.
 */

describe("GAME_PHASES — frontend (src/lib/constants/game.ts)", () => {
  it("is the 22-phase Japanese sequence + the Sports-only phases, in order", () => {
    // Indices 0..21 are the Japanese sequence (+ the phase_transition buffer at
    // 21); Sports-only phases are appended after so those indices stay stable.
    expect(SRC_GAME_PHASES).toEqual([
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
      "don_meet",
      "best_move",
    ]);
  });

  it("includes the phase_transition buffer", () => {
    expect(SRC_GAME_PHASES).toContain("phase_transition");
  });
});

describe("GAME_PHASES — backend (convex/lib/constants.ts)", () => {
  it("is the 21-phase list WITHOUT the phase_transition buffer", () => {
    // KNOWN DRIFT: the two GAME_PHASES lists are duplicated and out of sync —
    // the backend copy predates the phase_transition buffer. The refactor
    // collapses these into a single `definition.phases`. Documented here so the
    // consolidation is intentional, not a silent behavior change.
    expect(CONVEX_GAME_PHASES).not.toContain("phase_transition");
    expect(CONVEX_GAME_PHASES).toHaveLength(21);
  });

  it("shares its ordering with the first 21 frontend phases", () => {
    expect(SRC_GAME_PHASES.slice(0, 21)).toEqual([...CONVEX_GAME_PHASES]);
  });
});

describe("Japanese role set & deck", () => {
  it("declares the 8 Japanese roles", () => {
    expect(JAPANESE_MAFIA_ROLES).toEqual([
      "DON",
      "MAFIA",
      "MAFIA_RIGHT_HAND",
      "SHOGUN",
      "YAKUZA",
      "DETECTIVE",
      "CITIZEN",
      "DOCTOR",
    ]);
  });

  it("deals a 12-card deck without MAFIA_RIGHT_HAND (promoted in-game)", () => {
    expect(JAPANESE_MAFIA_ROLE_DISTRIBUTION).toHaveLength(12);
    expect(JAPANESE_MAFIA_ROLE_DISTRIBUTION).not.toContain("MAFIA_RIGHT_HAND");
  });

  it("deals exactly 2 MAFIA and 5 CITIZEN cards", () => {
    const deck = JAPANESE_MAFIA_ROLE_DISTRIBUTION;
    expect(deck.filter((r) => r === "MAFIA")).toHaveLength(2);
    expect(deck.filter((r) => r === "CITIZEN")).toHaveLength(5);
  });

  it("defines the mafia and yakuza teams", () => {
    expect(MAFIA_TEAM_ROLES).toEqual(["DON", "MAFIA_RIGHT_HAND", "MAFIA"]);
    expect(YAKUZA_TEAM_ROLES).toEqual(["YAKUZA", "SHOGUN"]);
  });
});
