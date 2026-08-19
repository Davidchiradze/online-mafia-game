/**
 * Serial Killer Mafia definition — characterization tests.
 *
 * Mirrors `sportsDefinition.test.ts`. The win-condition block is the one that
 * matters: this is the first variant whose outcome is NOT a function of the
 * alive roster alone, so every case here names the shot's state explicitly and
 * the pairs that differ only by that are the point.
 *
 * The expectations are transcribed from the LOOKUP TABLES in
 * docs/variants/serial_killer/win-conditions.md §5, not re-derived from the
 * implementation. A declared outcome beats a simulated one, so if these two
 * ever disagree the doc is the authority.
 */

import { describe, expect, it } from "vitest";

import { SERIAL_KILLER_DEFINITION } from "@convex/games/serialkiller/definition";
import { GamePhase } from "@/shared/lib/constants/game";
import type { Role, WinStateContext } from "@convex/games/core/types";

const def = SERIAL_KILLER_DEFINITION;

const HOLDING: WinStateContext = { serialKillerHasShot: true };
const SPENT: WinStateContext = { serialKillerHasShot: false };

/** Build an alive roster from counts, so cases read like the doc's tables. */
function roster(opts: {
  mafia?: number;
  sk?: boolean;
  doctor?: boolean;
  town?: number;
}): Role[] {
  const out: Role[] = [];
  for (let i = 0; i < (opts.mafia ?? 0); i++) out.push(i === 0 ? "DON" : "MAFIA");
  if (opts.sk) out.push("SERIAL_KILLER");
  if (opts.doctor) out.push("DOCTOR");
  for (let i = 0; i < (opts.town ?? 0); i++) out.push("CITIZEN");
  return out;
}

describe("SERIAL_KILLER_DEFINITION — roles & deck (§2)", () => {
  it("seats 11 and deals exactly that many cards", () => {
    expect(def.seatCount).toBe(11);
    expect(def.roleDistribution).toHaveLength(11);
  });

  it("deals the declared deck", () => {
    const counts = new Map<string, number>();
    for (const r of def.roleDistribution) {
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({
      DON: 1,
      MAFIA: 2,
      SERIAL_KILLER: 1,
      DETECTIVE: 1,
      DOCTOR: 1,
      CITIZEN: 5,
    });
  });

  it("maps the Serial Killer to its own faction, not to town", () => {
    expect(def.roleToFaction("SERIAL_KILLER")).toBe("serial_killer");
    expect(def.roleToFaction("DON")).toBe("mafia");
    expect(def.roleToFaction("MAFIA")).toBe("mafia");
    expect(def.roleToFaction("DETECTIVE")).toBe("citizens");
    expect(def.roleToFaction("DOCTOR")).toBe("citizens");
    expect(def.roleToFaction("CITIZEN")).toBe("citizens");
    // No such role in this deck — the fallback is town, as everywhere.
    expect(def.roleToFaction("YAKUZA")).toBe("citizens");
  });

  it("gives the Serial Killer no team", () => {
    // `getVisible` reads `teams` to answer "who are my teammates". A one-member
    // team would be harmless but would state something false.
    expect(Object.keys(def.teams)).toEqual(["mafia"]);
    expect(def.teams.mafia).toEqual(["DON", "MAFIA"]);
  });

  it("carries the Serial Killer engine flags", () => {
    expect(def.flags).toEqual({
      hasIntroductionPhase: true,
      hasFarewellSpeech: true,
      firstDaySingleNomineeSkipsToNight: false,
      thirdFoulSpeakingBan: false,
      hasBestMove: false,
      // The inversion of Japanese (§5.2).
      mafiaKillsOnFirstNight: true,
    });
  });
});

describe("SERIAL_KILLER_DEFINITION — phase graph (§3)", () => {
  it("replaces the two yakuza phases and keeps everything else", () => {
    expect(def.phases).not.toContain(GamePhase.YAKUDA_SHOGUN_MEET);
    expect(def.phases).not.toContain(GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET);
    expect(def.phases).toContain(GamePhase.SERIAL_KILLER_MEET);
    expect(def.phases).toContain(GamePhase.SERIAL_KILLER_CHOOSES_TARGET);
    // Japanese-only phases Sports drops but this variant keeps.
    expect(def.phases).toContain(GamePhase.INTRODUCTION_PHASE);
    expect(def.phases).toContain(GamePhase.DOCTOR_MEET);
    expect(def.phases).toContain(GamePhase.DOCTOR_HEALS_PLAYER);
  });

  it("routes the night through the Serial Killer before the Doctor", () => {
    // The Doctor must be able to save a Serial Killer target, which only works
    // if the pick is recorded by the time `doctor_heals_player` runs (§3).
    expect(def.nextPhase(GamePhase.DON_CHECKS_FOR_DETECTIVE)).toBe(
      GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
    );
    expect(def.nextPhase(GamePhase.SERIAL_KILLER_CHOOSES_TARGET)).toBe(
      GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
    );
    expect(def.nextPhase(GamePhase.DETECTIVE_CHECKS_FOR_MAFIA)).toBe(
      GamePhase.DOCTOR_HEALS_PLAYER,
    );
  });

  it("keeps the resolve-marker edge into the farewell", () => {
    // Reaching the farewell is what makes the dawn seam resolve the night.
    // Without this edge the night never resolves and the game hangs.
    expect(def.nextPhase(GamePhase.DOCTOR_HEALS_PLAYER)).toBe(
      GamePhase.FAREWELL_SPEECH,
    );
  });

  it("leaves state-dependent transitions to the server", () => {
    for (const phase of [
      GamePhase.INTRODUCTION_PHASE,
      GamePhase.FAREWELL_SPEECH,
      GamePhase.DAY_PHASE,
      GamePhase.NOMINATED_PLAYERS_SPEAK,
      GamePhase.REPEAT,
    ]) {
      expect(def.nextPhase(phase)).toBeNull();
    }
  });
});

describe("SERIAL_KILLER_DEFINITION — night resolution (§4.1)", () => {
  const resolve = def.night.resolveKills;

  it("is single-authority with the Serial Killer acting", () => {
    expect(def.night.kind).toBe("single-authority");
    expect(def.night.actingRoles).toContain("SERIAL_KILLER");
  });

  it("kills both targets when they differ", () => {
    expect(resolve({ mafiaTarget: 3, serialKillerTarget: 5 })).toEqual([3, 5]);
  });

  it("kills once when both pick the same seat", () => {
    expect(resolve({ mafiaTarget: 3, serialKillerTarget: 3 })).toEqual([3]);
  });

  it("lets the Doctor suppress either kill, but only one", () => {
    expect(resolve({ mafiaTarget: 3, serialKillerTarget: 5, healedPlayer: 3 })).toEqual([5]);
    expect(resolve({ mafiaTarget: 3, serialKillerTarget: 5, healedPlayer: 5 })).toEqual([3]);
    // Both on the healed seat → nobody dies.
    expect(resolve({ mafiaTarget: 3, serialKillerTarget: 3, healedPlayer: 3 })).toEqual([]);
  });

  it("ignores the yakuza slot it replaced", () => {
    expect(resolve({ mafiaTarget: 3, yakuzaTarget: 7 })).toEqual([3]);
  });

  it("kills nobody when nothing was chosen", () => {
    expect(resolve({})).toEqual([]);
  });
});

describe("SERIAL_KILLER_DEFINITION — win conditions (§5)", () => {
  const winner = (
    r: Parameters<typeof roster>[0],
    state: WinStateContext,
  ) => def.decideWinner(roster(r), "beforeDay", state);

  it("gives the Serial Killer every 1-on-1, empty gun or not (§5.1)", () => {
    for (const state of [HOLDING, SPENT]) {
      expect(winner({ mafia: 1, sk: true }, state)).toBe("serial_killer");
      expect(winner({ sk: true, town: 1 }, state)).toBe("serial_killer");
      // 1v0 — last player standing.
      expect(winner({ sk: true }, state)).toBe("serial_killer");
    }
  });

  it("blocks the citizens' sweep while the Serial Killer lives (§1.2)", () => {
    expect(winner({ sk: true, town: 4 }, SPENT)).toBeNull();
    expect(winner({ sk: true, doctor: true, town: 3 }, HOLDING)).toBeNull();
    // Dead Serial Killer, no mafia → the sweep finally lands.
    expect(winner({ town: 5 }, SPENT)).toBe("citizens");
  });

  it("ends 2 mafia + Serial Killer with no town, shot or not (§5.2)", () => {
    // The mafia must kill someone and the Serial Killer is the only target.
    expect(winner({ mafia: 2, sk: true }, HOLDING)).toBe("mafia");
    expect(winner({ mafia: 2, sk: true }, SPENT)).toBe("mafia");
  });

  /**
   * The clearest example of the whole variant (§5.3). Identical rosters; the
   * shot alone decides. If this pair ever collapses to one answer, the
   * `WinStateContext` plumbing has broken somewhere between here and
   * `recordWinnerIfDecided`.
   */
  it("turns on the shot at 2 mafia + Serial Killer + 1 town (§5.3)", () => {
    expect(winner({ mafia: 2, sk: true, town: 1 }, HOLDING)).toBeNull();
    expect(winner({ mafia: 2, sk: true, town: 1 }, SPENT)).toBe("mafia");
  });

  it("ends 3 mafia + Serial Killer + 1 town even with the shot (§5.4)", () => {
    // Firing leaves 2 mafia + spent SK + 0 town — still parity, nothing gained.
    expect(winner({ mafia: 3, sk: true, town: 1 }, HOLDING)).toBe("mafia");
    expect(winner({ mafia: 3, sk: true, town: 1 }, SPENT)).toBe("mafia");
  });

  /**
   * The ONLY position in the entire game where the Doctor changes the answer
   * (§5.5). A Doctor save costs one death instead of two, which is the single
   * line that can break parity.
   */
  it("lets the Doctor reopen 3 mafia + Serial Killer + 2 town (§5.5)", () => {
    expect(winner({ mafia: 3, sk: true, town: 2 }, HOLDING)).toBe("mafia");
    expect(winner({ mafia: 3, sk: true, doctor: true, town: 1 }, HOLDING)).toBeNull();
    // Without the shot the Doctor cannot help — there is nothing to break parity.
    expect(winner({ mafia: 3, sk: true, doctor: true, town: 1 }, SPENT)).toBe("mafia");
  });

  it("decides nothing above six alive except a sweep (§5.6)", () => {
    expect(winner({ mafia: 3, sk: true, doctor: true, town: 3 }, HOLDING)).toBeNull();
    expect(winner({ mafia: 3, sk: true, doctor: true, town: 3 }, SPENT)).toBeNull();
    // A sweep still ends it at any size.
    expect(winner({ mafia: 7 }, SPENT)).toBe("mafia");
    expect(winner({ doctor: true, town: 6 }, SPENT)).toBe("citizens");
  });

  it("reads an absent state as a live shot", () => {
    // The safe default: continues play rather than ending a game early.
    expect(def.decideWinner(roster({ mafia: 2, sk: true, town: 1 }), "beforeDay")).toBeNull();
  });

  it("reports no_contest when nobody is alive", () => {
    expect(winner({}, SPENT)).toBe("no_contest");
  });
});

describe("SERIAL_KILLER_DEFINITION — describeWin", () => {
  it("never claims a yakuza clan", () => {
    const result = def.describeWin(roster({ mafia: 2, sk: true, town: 1 }), "beforeDay", SPENT);
    expect(result).toEqual({
      faction: "mafia",
      aliveTotal: 4,
      mafiaAlive: 2,
      yakuzaAlive: false,
      shogunAlive: false,
    });
  });

  it("names the Serial Killer as the deciding role in their win", () => {
    const result = def.describeWin(roster({ mafia: 1, sk: true }), "beforeDay", HOLDING);
    expect(result).toEqual({
      faction: "serial_killer",
      aliveTotal: 2,
      mafiaAlive: 1,
      yakuzaAlive: false,
      shogunAlive: false,
      decidedRole: "SERIAL_KILLER",
    });
  });

  it("agrees with decideWinner everywhere", () => {
    // The two cannot drift — decideWinner delegates — but this pins it.
    const cases: Parameters<typeof roster>[0][] = [
      { mafia: 2, sk: true, town: 1 },
      { mafia: 3, sk: true, doctor: true, town: 1 },
      { mafia: 1, sk: true },
      { town: 5 },
      {},
    ];
    for (const c of cases) {
      for (const state of [HOLDING, SPENT]) {
        const described = def.describeWin(roster(c), "beforeDay", state);
        const decided = def.decideWinner(roster(c), "beforeDay", state);
        const expected =
          described === null || described === "no_contest"
            ? described
            : described.faction;
        expect(decided).toBe(expected);
      }
    }
  });
});
