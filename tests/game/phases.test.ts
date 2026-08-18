import { describe, it, expect } from "vitest";
import {
  GAME_PHASES as SRC_GAME_PHASES,
  JAPANESE_MAFIA_ROLES, GamePhase } from "@/shared/lib/constants/game";
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
 * refactor (docs/engine/variant-architecture.md §2.1, §4). Pinning the current Japanese values
 * makes any consolidation a deliberate, visible diff — and guards the guardrail
 * "phases by name, never by index" by locking the exact ordering.
 */

describe("GAME_PHASES — frontend (src/lib/constants/game.ts)", () => {
  it("is the 24-phase Japanese sequence + every variant-only phase, in order", () => {
    // Reading order, not a stable-index contract: nothing reads this array
    // positionally, so a shared phase sits where it happens in a round.
    expect(SRC_GAME_PHASES).toEqual([
      GamePhase.GAME_SESSION_STARTED,
      GamePhase.PICKING_ROLES,
      GamePhase.MAFIA_MEET,
      GamePhase.DON_MEET,
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
      GamePhase.BEST_MOVE,
      GamePhase.SERIAL_KILLER_MEET,
      GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
    ]);
  });

  it("includes the phase_transition buffer", () => {
    expect(SRC_GAME_PHASES).toContain(GamePhase.PHASE_TRANSITION);
  });
});

describe("GAME_PHASES — backend (convex/lib/constants.ts)", () => {
  it("is the 20-phase list WITHOUT the phase_transition buffer", () => {
    // KNOWN DRIFT: the two GAME_PHASES lists are duplicated and out of sync —
    // the backend copy predates the phase_transition buffer. The refactor
    // collapses these into a single `definition.phases`. Documented here so the
    // consolidation is intentional, not a silent behavior change.
    expect(CONVEX_GAME_PHASES).not.toContain(GamePhase.PHASE_TRANSITION);
    expect(CONVEX_GAME_PHASES).toHaveLength(20);
  });

  it("shares its ordering with the first 20 frontend phases", () => {
    expect(SRC_GAME_PHASES.slice(0, 20)).toEqual([...CONVEX_GAME_PHASES]);
  });
});

describe("Japanese role set & deck", () => {
  it("declares the 7 Japanese roles", () => {
    expect(JAPANESE_MAFIA_ROLES).toEqual([
      "DON",
      "MAFIA",
      "SHOGUN",
      "YAKUZA",
      "DETECTIVE",
      "CITIZEN",
      "DOCTOR",
    ]);
  });

  it("deals a 12-card deck covering every role it can assign", () => {
    expect(JAPANESE_MAFIA_ROLE_DISTRIBUTION).toHaveLength(12);
    // No role is reachable only by in-game promotion any more: everything
    // Japanese can assign is dealt from the deck.
    for (const role of JAPANESE_MAFIA_ROLES) {
      expect(JAPANESE_MAFIA_ROLE_DISTRIBUTION).toContain(role);
    }
  });

  it("keeps the retired MAFIA_RIGHT_HAND out of the deck and the role set", () => {
    expect(JAPANESE_MAFIA_ROLE_DISTRIBUTION).not.toContain("MAFIA_RIGHT_HAND");
    expect(JAPANESE_MAFIA_ROLES).not.toContain("MAFIA_RIGHT_HAND");
  });

  it("deals exactly 2 MAFIA and 5 CITIZEN cards", () => {
    const deck = JAPANESE_MAFIA_ROLE_DISTRIBUTION;
    expect(deck.filter((r) => r === "MAFIA")).toHaveLength(2);
    expect(deck.filter((r) => r === "CITIZEN")).toHaveLength(5);
  });

  it("defines the mafia and yakuza teams", () => {
    expect(MAFIA_TEAM_ROLES).toEqual(["DON", "MAFIA"]);
    expect(YAKUZA_TEAM_ROLES).toEqual(["YAKUZA", "SHOGUN"]);
  });
});
