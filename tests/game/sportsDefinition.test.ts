import { describe, it, expect } from "vitest";
import { getGameDefinition } from "@convex/games/registry";
import { SPORTS_DEFINITION } from "@convex/games/sports/definition";
import type { WinContext } from "@convex/lib/winConditions";

/**
 * CHARACTERIZATION TEST — the Sports Mafia `GameDefinition` (Phase 2, data only).
 *
 * Validates the definition against the ruleset spec in docs/sports-mafia.md:
 * roles/deck/factions (§2), the phase graph (§3), the parity `decideWinner`
 * worked-examples table (§6), and the unanimous-vote night resolution (§5.2).
 * These are the tables the implementation must reproduce — assertions are the
 * spec, not the code.
 */

describe("registry — sports_mafia", () => {
  it("resolves to the Sports definition", () => {
    expect(getGameDefinition("sports_mafia")).toBe(SPORTS_DEFINITION);
  });
});

describe("SPORTS_DEFINITION — roles, deck, factions (§2)", () => {
  const def = SPORTS_DEFINITION;

  it("declares its id and 10-seat count", () => {
    expect(def.id).toBe("sports_mafia");
    expect(def.seatCount).toBe(10);
  });

  it("has exactly the 4 Sports roles", () => {
    expect(def.roles).toEqual(["DON", "MAFIA", "DETECTIVE", "CITIZEN"]);
  });

  it("deals a 10-card deck: 1 DON, 2 MAFIA, 1 DETECTIVE, 6 CITIZEN", () => {
    const deck = def.roleDistribution;
    expect(deck).toHaveLength(10);
    expect(deck).toHaveLength(def.seatCount);
    expect(deck.filter((r) => r === "DON")).toHaveLength(1);
    expect(deck.filter((r) => r === "MAFIA")).toHaveLength(2);
    expect(deck.filter((r) => r === "DETECTIVE")).toHaveLength(1);
    expect(deck.filter((r) => r === "CITIZEN")).toHaveLength(6);
  });

  it("has two factions and only a mafia team", () => {
    expect(def.factions).toEqual(["mafia", "citizens"]);
    expect(def.teams.mafia).toEqual(["DON", "MAFIA"]);
    expect(def.teams.yakuza).toBeUndefined();
  });

  it("maps DON/MAFIA → mafia and everything else → citizens", () => {
    expect(def.roleToFaction("DON")).toBe("mafia");
    expect(def.roleToFaction("MAFIA")).toBe("mafia");
    expect(def.roleToFaction("DETECTIVE")).toBe("citizens");
    expect(def.roleToFaction("CITIZEN")).toBe("citizens");
    expect(def.roleToFaction("SHOGUN")).toBe("citizens"); // no such role → citizens
    expect(def.roleToFaction("")).toBe("citizens");
  });

  it("carries the Sports engine flags", () => {
    expect(def.flags).toEqual({
      hasIntroductionPhase: false,
      hasFarewellSpeech: true,
      hasRightHandPromotion: false,
      firstDaySingleNomineeSkipsToNight: true,
      thirdFoulSpeakingBan: true,
    });
  });
});

describe("SPORTS_DEFINITION — phase graph (§3)", () => {
  const def = SPORTS_DEFINITION;

  it("drops the Japanese-only phases", () => {
    const dropped = [
      "introduction_phase",
      "don_chooses_right_hand",
      "yakuda_shogun_meet",
      "doctor_meet",
      "right_hand_checks_for_yakuza",
      "yakuza_and_shogun_chooses_target",
      "doctor_heals_player",
    ];
    for (const p of dropped) expect(def.phases).not.toContain(p);
  });

  it("keeps the two info-check phases", () => {
    expect(def.phases).toContain("don_checks_for_detective");
    expect(def.phases).toContain("detective_checks_for_mafia");
  });

  const edges: Array<[string, string]> = [
    ["picking_roles", "mafia_meet"],
    ["mafia_meet", "detective_meet"], // skips don_chooses_right_hand
    ["detective_meet", "day_phase"], // no introduction_phase
    ["night_phase", "mafia_chooses_target"],
    ["mafia_chooses_target", "don_checks_for_detective"],
    ["don_checks_for_detective", "detective_checks_for_mafia"], // skips right_hand check
    ["detective_checks_for_mafia", "farewell_speech"], // resolve-marker
    ["voting", "repeat"],
  ];
  it.each(edges)("nextPhase: %s → %s", (from, to) => {
    expect(def.nextPhase(from)).toBe(to);
  });

  it("returns null for branching / terminal phases", () => {
    for (const p of ["day_phase", "farewell_speech", "repeat", "end_game"]) {
      expect(def.nextPhase(p)).toBeNull();
    }
  });
});

describe("SPORTS_DEFINITION.decideWinner — parity rule (§6 worked examples)", () => {
  const def = SPORTS_DEFINITION;
  // [description, aliveRoles, expected]
  const cases: Array<[string, string[], string | null]> = [
    ["3 mafia vs 4 cit → continue", ["DON", "MAFIA", "MAFIA", "DETECTIVE", "CITIZEN", "CITIZEN", "CITIZEN"], null],
    ["3 mafia vs 3 cit → mafia (3v3)", ["DON", "MAFIA", "MAFIA", "CITIZEN", "CITIZEN", "CITIZEN"], "mafia"],
    ["2 mafia vs 2 cit → mafia (2v2)", ["DON", "MAFIA", "CITIZEN", "CITIZEN"], "mafia"],
    ["1 mafia vs 1 cit → mafia (1v1)", ["DON", "CITIZEN"], "mafia"],
    ["2 mafia vs 3 cit → continue", ["DON", "MAFIA", "CITIZEN", "CITIZEN", "CITIZEN"], null],
    ["1 mafia vs 2 cit → continue", ["DON", "CITIZEN", "CITIZEN"], null],
    ["0 mafia vs 4 cit → citizens", ["DETECTIVE", "CITIZEN", "CITIZEN", "CITIZEN"], "citizens"],
    ["empty table → no_contest", [], "no_contest"],
  ];

  it.each(cases)("%s", (_desc, roles, expected) => {
    expect(def.decideWinner(roles, "beforeDay")).toBe(expected);
  });

  it("is context-independent (beforeNight === beforeDay)", () => {
    const roles = ["DON", "MAFIA", "MAFIA", "CITIZEN", "CITIZEN", "CITIZEN"];
    const ctxs: WinContext[] = ["beforeNight", "beforeDay"];
    const [a, b] = ctxs.map((c) => def.decideWinner(roles, c));
    expect(a).toBe(b);
    expect(a).toBe("mafia");
  });
});

describe("SPORTS_DEFINITION.night — unanimous-vote resolution (§5.2)", () => {
  const { night } = SPORTS_DEFINITION;

  it("is the unanimous-vote model", () => {
    expect(night.kind).toBe("unanimous-vote");
  });

  it("kills when every living mafia picked the same target", () => {
    expect(
      night.resolveKills(
        {
          mafiaTargetSelections: [
            { mafiaSeat: 1, targetSeat: 5 },
            { mafiaSeat: 2, targetSeat: 5 },
            { mafiaSeat: 3, targetSeat: 5 },
          ],
        },
        { livingMafiaSeats: [1, 2, 3] },
      ),
    ).toEqual([5]);
  });

  it("no kill when the mafia disagree", () => {
    expect(
      night.resolveKills(
        {
          mafiaTargetSelections: [
            { mafiaSeat: 1, targetSeat: 5 },
            { mafiaSeat: 2, targetSeat: 5 },
            { mafiaSeat: 3, targetSeat: 6 },
          ],
        },
        { livingMafiaSeats: [1, 2, 3] },
      ),
    ).toEqual([]);
  });

  it("no kill when a living mafia did not select", () => {
    expect(
      night.resolveKills(
        {
          mafiaTargetSelections: [
            { mafiaSeat: 1, targetSeat: 5 },
            { mafiaSeat: 2, targetSeat: 5 },
          ],
        },
        { livingMafiaSeats: [1, 2, 3] },
      ),
    ).toEqual([]);
  });

  it("no kill when a lone mafia abstains", () => {
    expect(
      night.resolveKills({ mafiaTargetSelections: [] }, { livingMafiaSeats: [1] }),
    ).toEqual([]);
  });

  it("kills when a lone mafia selects (trivially unanimous)", () => {
    expect(
      night.resolveKills(
        { mafiaTargetSelections: [{ mafiaSeat: 1, targetSeat: 7 }] },
        { livingMafiaSeats: [1] },
      ),
    ).toEqual([7]);
  });

  it("no kill when there are no living mafia", () => {
    expect(
      night.resolveKills(
        { mafiaTargetSelections: [{ mafiaSeat: 1, targetSeat: 7 }] },
        { livingMafiaSeats: [] },
      ),
    ).toEqual([]);
  });

  it("applies last-write-wins per voter", () => {
    expect(
      night.resolveKills(
        {
          mafiaTargetSelections: [
            { mafiaSeat: 1, targetSeat: 5 },
            { mafiaSeat: 1, targetSeat: 6 }, // seat 1 changed to 6
            { mafiaSeat: 2, targetSeat: 6 },
          ],
        },
        { livingMafiaSeats: [1, 2] },
      ),
    ).toEqual([6]);
  });

  it("ignores selections from non-living-mafia seats", () => {
    expect(
      night.resolveKills(
        {
          mafiaTargetSelections: [
            { mafiaSeat: 1, targetSeat: 5 },
            { mafiaSeat: 2, targetSeat: 5 },
            { mafiaSeat: 9, targetSeat: 3 }, // stray non-mafia seat
          ],
        },
        { livingMafiaSeats: [1, 2] },
      ),
    ).toEqual([5]);
  });
});
