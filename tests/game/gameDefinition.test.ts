import { describe, it, expect } from "vitest";
import { getGameDefinition } from "@convex/games/registry";
import { JAPANESE_DEFINITION } from "@convex/games/japanese/definition";
import {
  GAME_PHASES as CONVEX_GAME_PHASES,
  JAPANESE_MAFIA_ROLE_DISTRIBUTION,
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "@convex/lib/constants";
import { roleToFaction, type Faction } from "@convex/lib/roles";
import { decideWinner } from "@convex/games/japanese/winConditions";
import type { WinContext } from "@convex/lib/winConditions";
import { JAPANESE_MAFIA_ROLES } from "@/lib/constants/game";

/**
 * EQUIVALENCE / CHARACTERIZATION TEST — the Japanese `GameDefinition`.
 *
 * Phase 1 introduces the Game Definition registry (docs/game-types.md §2) as an
 * abstraction that WRAPS the current Japanese modules. This test proves the
 * assembled definition is a faithful mirror of today's constants and pure
 * functions, so wiring the engine to `getGameDefinition(...)` cannot silently
 * change behavior. New logic (`night.resolveKills`, `nextPhase`) is pinned
 * against the same cases the existing oracle asserts:
 *   - resolveKills ↔ convex/tests/gameEngine.test.ts (kill resolution)
 *   - nextPhase    ↔ tests/game/phaseTransitionGraph.test.ts (host-advance graph)
 *
 * As the refactor moves modules, only the import paths change — never the
 * assertions.
 */

describe("registry — getGameDefinition", () => {
  it("resolves japanese_mafia to the Japanese definition", () => {
    expect(getGameDefinition("japanese_mafia")).toBe(JAPANESE_DEFINITION);
  });

  it("throws for an unknown game type", () => {
    expect(() => getGameDefinition("nope")).toThrow();
  });

  it("resolves sports_mafia (registered in Phase 2)", () => {
    expect(getGameDefinition("sports_mafia").id).toBe("sports_mafia");
  });
});

describe("JAPANESE_DEFINITION — data mirrors the legacy constants", () => {
  const def = JAPANESE_DEFINITION;

  it("declares its id and seat count", () => {
    expect(def.id).toBe("japanese_mafia");
    expect(def.seatCount).toBe(12);
  });

  it("exposes the exact 8 Japanese roles", () => {
    expect(def.roles).toEqual([...JAPANESE_MAFIA_ROLES]);
  });

  it("deals the exact 12-card Japanese deck", () => {
    expect(def.roleDistribution).toEqual([...JAPANESE_MAFIA_ROLE_DISTRIBUTION]);
    expect(def.roleDistribution).toHaveLength(def.seatCount);
  });

  it("declares the 3 Japanese factions", () => {
    expect(def.factions).toEqual<Faction[]>(["mafia", "yakuza", "citizens"]);
  });

  it("mirrors the mafia and yakuza team membership", () => {
    expect(def.teams.mafia).toEqual([...MAFIA_TEAM_ROLES]);
    expect(def.teams.yakuza).toEqual([...YAKUZA_TEAM_ROLES]);
  });

  it("reuses the shared roleToFaction mapping for every role", () => {
    for (const role of [...def.roles, "UNKNOWN", ""]) {
      expect(def.roleToFaction(role)).toBe(roleToFaction(role));
    }
  });

  it("exposes the backend GAME_PHASES ordering", () => {
    expect(def.phases).toEqual([...CONVEX_GAME_PHASES]);
  });

  it("carries the Japanese engine flags", () => {
    expect(def.flags).toEqual({
      hasIntroductionPhase: true,
      hasFarewellSpeech: true,
      hasRightHandPromotion: true,
      firstDaySingleNomineeSkipsToNight: false,
      thirdFoulSpeakingBan: false,
      hasBestMove: false,
    });
  });
});

describe("JAPANESE_DEFINITION.decideWinner — delegates to the pinned tables", () => {
  const def = JAPANESE_DEFINITION;
  const cases: Array<[string[], WinContext]> = [
    [["DON", "MAFIA", "MAFIA_RIGHT_HAND", "CITIZEN", "CITIZEN", "DOCTOR"], "beforeDay"],
    [["DON", "MAFIA", "MAFIA_RIGHT_HAND", "DOCTOR", "YAKUZA"], "beforeNight"],
    [["YAKUZA", "SHOGUN", "CITIZEN"], "beforeDay"],
    [["CITIZEN", "DETECTIVE", "DOCTOR"], "beforeDay"],
    [[], "beforeDay"],
  ];
  it.each(cases)("matches lib decideWinner for %j (%s)", (roles, ctx) => {
    expect(def.decideWinner(roles, ctx)).toBe(decideWinner(roles, ctx));
  });
});

describe("JAPANESE_DEFINITION.nextPhase — the deterministic host-advance graph", () => {
  const def = JAPANESE_DEFINITION;

  // Exactly the deterministic edges in tests/game/phaseTransitionGraph.test.ts.
  const edges: Array<[string, string]> = [
    ["picking_roles", "mafia_meet"],
    ["mafia_meet", "don_chooses_right_hand"],
    ["don_chooses_right_hand", "yakuda_shogun_meet"],
    ["yakuda_shogun_meet", "detective_meet"],
    ["detective_meet", "doctor_meet"],
    ["doctor_meet", "introduction_phase"],
    ["night_phase", "mafia_chooses_target"],
    ["mafia_chooses_target", "don_checks_for_detective"],
    ["don_checks_for_detective", "right_hand_checks_for_yakuza"],
    ["right_hand_checks_for_yakuza", "yakuza_and_shogun_chooses_target"],
    ["yakuza_and_shogun_chooses_target", "detective_checks_for_mafia"],
    ["detective_checks_for_mafia", "doctor_heals_player"],
    ["doctor_heals_player", "farewell_speech"],
    ["voting", "repeat"],
  ];

  it.each(edges)("%s advances to %s", (from, to) => {
    expect(def.nextPhase(from)).toBe(to);
  });

  it("every edge endpoint is a real phase", () => {
    const valid = new Set<string>(def.phases);
    for (const [from, to] of edges) {
      expect(valid.has(from)).toBe(true);
      expect(valid.has(to)).toBe(true);
    }
  });

  // State-dependent / terminal transitions are owned by server mutations.
  const branchingOrTerminal = [
    "game_session_started",
    "introduction_phase",
    "farewell_speech",
    "day_phase",
    "nominated_players_speak",
    "repeat",
    "end_game",
  ];
  it.each(branchingOrTerminal)("returns null for the non-deterministic %s", (p) => {
    expect(def.nextPhase(p)).toBeNull();
  });
});

describe("JAPANESE_DEFINITION.night — single-authority resolution", () => {
  const { night } = JAPANESE_DEFINITION;

  it("is the single-authority model", () => {
    expect(night.kind).toBe("single-authority");
  });

  // Mirrors the convex-test kill-resolution cases (pre-shuffle killed seats).
  const cases: Array<[string, Parameters<typeof night.resolveKills>[0], number[]]> = [
    ["single mafia target dies", { mafiaTarget: 8 }, [8]],
    ["healed mafia target survives", { mafiaTarget: 8, healedPlayer: 8 }, []],
    ["distinct mafia + yakuza targets both die", { mafiaTarget: 6, yakuzaTarget: 8 }, [6, 8]],
    ["same mafia + yakuza target de-duplicates", { mafiaTarget: 8, yakuzaTarget: 8 }, [8]],
    ["no targets → no kills", {}, []],
    ["lone yakuza target dies", { yakuzaTarget: 5 }, [5]],
    ["heal cancels only the matching target", { mafiaTarget: 6, yakuzaTarget: 8, healedPlayer: 6 }, [8]],
  ];

  it.each(cases)("%s", (_desc, state, expected) => {
    expect(night.resolveKills(state)).toEqual(expected);
  });
});
