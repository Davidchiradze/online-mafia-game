import { describe, it, expect } from "vitest";
import {
  decideWinner,
  describeWin,
  winMethodLabel,
  type WinContext,
  type GameOutcome,
  type WinMethod,
} from "@convex/lib/winConditions";

/**
 * CHARACTERIZATION TEST — Japanese win conditions (regression oracle).
 *
 * Pins the CURRENT behavior of `decideWinner` / `describeWin` / `winMethodLabel`
 * so the game-types refactor (docs/game-types.md) can prove the Japanese game is
 * unchanged as this logic moves into `convex/games/japanese/winConditions.ts`.
 * Only the import path above should change during the refactor — never the
 * assertions. If an assertion must change to stay green, that is a behavior
 * change, not a refactor.
 *
 * Roles: mafia team = DON / MAFIA / MAFIA_RIGHT_HAND; yakuza clan = YAKUZA /
 * SHOGUN; everything else (CITIZEN / DETECTIVE / DOCTOR) is town.
 */

describe("decideWinner — Japanese", () => {
  // [description, aliveRoles, context, expected]
  const cases: Array<[string, string[], WinContext, GameOutcome | null]> = [
    // ── No players left → no_contest (checked before the Citizens sweep) ──
    ["empty table is a no-contest (beforeDay)", [], "beforeDay", "no_contest"],
    ["empty table is a no-contest (beforeNight)", [], "beforeNight", "no_contest"],

    // ── Global sweeps (any N, checked before the per-N tables) ──
    [
      "only town alive → citizens (N=3)",
      ["CITIZEN", "DETECTIVE", "DOCTOR"],
      "beforeDay",
      "citizens",
    ],
    [
      "only town alive → citizens even above 6 players (N=7)",
      ["CITIZEN", "CITIZEN", "CITIZEN", "CITIZEN", "DETECTIVE", "DOCTOR", "CITIZEN"],
      "beforeDay",
      "citizens",
    ],
    [
      "only mafia alive → mafia (N=3)",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND"],
      "beforeDay",
      "mafia",
    ],
    [
      "only yakuza clan alive → yakuza (N=2, Yakuza + Shogun)",
      ["YAKUZA", "SHOGUN"],
      "beforeDay",
      "yakuza",
    ],

    // ── Sweeps cover N=1, which the per-N tables stop short of ──
    ["lone YAKUZA → yakuza", ["YAKUZA"], "beforeDay", "yakuza"],
    ["lone SHOGUN → yakuza", ["SHOGUN"], "beforeDay", "yakuza"],
    ["lone MAFIA → mafia", ["MAFIA"], "beforeDay", "mafia"],
    ["lone CITIZEN → citizens", ["CITIZEN"], "beforeDay", "citizens"],
    ["lone DOCTOR → citizens", ["DOCTOR"], "beforeDay", "citizens"],

    // ── N = 6 ──
    [
      "N=6, m=3, no yakuza → mafia",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "CITIZEN", "CITIZEN", "DOCTOR"],
      "beforeDay",
      "mafia",
    ],
    [
      "N=6, m=3, yakuza alive → continue (lone shogun can't tip it)",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "YAKUZA", "CITIZEN", "DOCTOR"],
      "beforeDay",
      null,
    ],
    [
      "N=6, m=2 → continue",
      ["DON", "MAFIA", "CITIZEN", "CITIZEN", "DETECTIVE", "DOCTOR"],
      "beforeDay",
      null,
    ],

    // ── N = 5 — the Doctor+Yakuza beforeNight exception ──
    [
      "N=5, m=3, others exactly {DOCTOR, YAKUZA}, beforeNight → continue (exception)",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "DOCTOR", "YAKUZA"],
      "beforeNight",
      null,
    ],
    [
      "N=5, m=3, others exactly {DOCTOR, YAKUZA}, beforeDay → mafia (exception is night-only)",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "DOCTOR", "YAKUZA"],
      "beforeDay",
      "mafia",
    ],
    [
      "N=5, m=3, others {CITIZEN, YAKUZA} (not the exception), beforeNight → mafia",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "CITIZEN", "YAKUZA"],
      "beforeNight",
      "mafia",
    ],
    [
      "N=5, m=2 → continue",
      ["DON", "MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"],
      "beforeDay",
      null,
    ],

    // ── N = 4 ──
    [
      "N=4, m=3 → mafia",
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "CITIZEN"],
      "beforeDay",
      "mafia",
    ],
    [
      "N=4, Yakuza+Shogun, others exactly {DOCTOR + one mafia} → continue (exception)",
      ["YAKUZA", "SHOGUN", "DOCTOR", "MAFIA"],
      "beforeDay",
      null,
    ],
    [
      "N=4, Yakuza+Shogun, others {CITIZEN, DOCTOR} → yakuza",
      ["YAKUZA", "SHOGUN", "CITIZEN", "DOCTOR"],
      "beforeDay",
      "yakuza",
    ],
    [
      "N=4, Yakuza+Shogun, others {MAFIA, CITIZEN} (no doctor) → yakuza",
      ["YAKUZA", "SHOGUN", "MAFIA", "CITIZEN"],
      "beforeDay",
      "yakuza",
    ],
    [
      "N=4, m=2, no yakuza → mafia",
      ["DON", "MAFIA", "CITIZEN", "DOCTOR"],
      "beforeDay",
      "mafia",
    ],
    [
      "N=4, m=2, yakuza alive (no shogun) → continue",
      ["DON", "MAFIA", "YAKUZA", "CITIZEN"],
      "beforeDay",
      null,
    ],
    [
      "N=4, m=1 → continue",
      ["DON", "CITIZEN", "DETECTIVE", "DOCTOR"],
      "beforeDay",
      null,
    ],

    // ── N = 3 ──
    ["N=3, m=2 → mafia", ["DON", "MAFIA", "CITIZEN"], "beforeDay", "mafia"],
    [
      "N=3, Yakuza+Shogun → yakuza",
      ["YAKUZA", "SHOGUN", "CITIZEN"],
      "beforeDay",
      "yakuza",
    ],
    [
      "N=3, m=1, no full yakuza clan → continue",
      ["DON", "CITIZEN", "DETECTIVE"],
      "beforeDay",
      null,
    ],
    [
      "N=3, lone yakuza (no shogun) among town → continue",
      ["YAKUZA", "CITIZEN", "DOCTOR"],
      "beforeDay",
      null,
    ],

    // ── N = 2 (1-on-1s) ──
    ["N=2, m=2 → mafia", ["DON", "MAFIA"], "beforeDay", "mafia"],
    [
      "N=2, lone Yakuza vs town → yakuza (clan wins 1v1)",
      ["YAKUZA", "CITIZEN"],
      "beforeDay",
      "yakuza",
    ],
    [
      "N=2, lone Shogun vs lone Mafia → yakuza (clan beats mafia 1v1)",
      ["SHOGUN", "DON"],
      "beforeDay",
      "yakuza",
    ],
    [
      "N=2, lone Mafia vs town → mafia",
      ["MAFIA", "CITIZEN"],
      "beforeDay",
      "mafia",
    ],
  ];

  it.each(cases)("%s", (_desc, aliveRoles, context, expected) => {
    expect(decideWinner(aliveRoles, context)).toBe(expected);
  });
});

describe("describeWin — structured snapshot", () => {
  it("returns the endgame snapshot for a decided mafia win", () => {
    const result = describeWin(
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "CITIZEN", "CITIZEN", "DOCTOR"],
      "beforeDay",
    );
    expect(result).toEqual<WinMethod>({
      faction: "mafia",
      decidedRole: undefined,
      aliveTotal: 6,
      mafiaAlive: 3,
      yakuzaAlive: false,
      shogunAlive: false,
    });
  });

  it("records the headline role for a Shogun 1v1 yakuza win", () => {
    const result = describeWin(["SHOGUN", "CITIZEN"], "beforeDay");
    expect(result).toEqual<WinMethod>({
      faction: "yakuza",
      decidedRole: "SHOGUN",
      aliveTotal: 2,
      mafiaAlive: 0,
      yakuzaAlive: false,
      shogunAlive: true,
    });
  });

  it("returns no_contest for an empty table", () => {
    expect(describeWin([], "beforeDay")).toBe("no_contest");
  });

  it("returns null while the game continues", () => {
    expect(
      describeWin(
        ["DON", "MAFIA", "MAFIA_RIGHT_HAND", "CITIZEN", "CITIZEN", "DETECTIVE", "DOCTOR"],
        "beforeDay",
      ),
    ).toBeNull();
  });
});

describe("winMethodLabel", () => {
  it("labels a mafia win by the alive mafia team", () => {
    expect(
      winMethodLabel({
        faction: "mafia",
        aliveTotal: 6,
        mafiaAlive: 3,
        yakuzaAlive: false,
        shogunAlive: false,
      }),
    ).toBe("3vs3");
  });

  it("labels a lone-Shogun yakuza win as 1vs1", () => {
    expect(
      winMethodLabel({
        faction: "yakuza",
        aliveTotal: 2,
        mafiaAlive: 0,
        yakuzaAlive: false,
        shogunAlive: true,
      }),
    ).toBe("1vs1");
  });

  it("counts both clan members for a Yakuza+Shogun win", () => {
    expect(
      winMethodLabel({
        faction: "yakuza",
        aliveTotal: 3,
        mafiaAlive: 0,
        yakuzaAlive: true,
        shogunAlive: true,
      }),
    ).toBe("2vs1");
  });

  it("labels a citizens sweep as everyone-vs-nobody", () => {
    expect(
      winMethodLabel({
        faction: "citizens",
        aliveTotal: 5,
        mafiaAlive: 0,
        yakuzaAlive: false,
        shogunAlive: false,
      }),
    ).toBe("5vs0");
  });
});
