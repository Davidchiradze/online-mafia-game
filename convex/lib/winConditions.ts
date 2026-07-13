/**
 * Pure win-condition logic for Japanese Mafia.
 *
 * `decideWinner` is a pure function (no DB access) implementing the decision
 * algorithm in docs/game-end-conditions.md §7. It inspects the roles of the
 * *alive* players and returns the winning faction, or `null` to continue.
 *
 * The win conditions are **declared outcomes** from the game's rules — they are
 * not re-simulated from night mechanics. Where a stated rule and a naive
 * simulation disagree, the stated rule wins.
 */

import { MAFIA_TEAM_ROLES } from "./constants";

export type WinContext = "beforeNight" | "beforeDay";
export type Winner = "mafia" | "yakuza" | "citizens";
/**
 * A finished-game outcome: a faction win, or a `"no_contest"` — a total mutual
 * elimination where no player is left alive (e.g. the last survivors all voted
 * to leave in a "both leave" vote). A no-contest is not a faction win: it is
 * logged with `winner: null` and applies no ELO change — the same terminal
 * outcome as an admin force-end.
 */
export type GameOutcome = Winner | "no_contest";

/**
 * Structured snapshot of the endgame state at the moment a winner is decided.
 * The human label is derived separately via `winMethodLabel` — not stored.
 */
export type WinMethod = {
  faction: Winner;
  aliveTotal: number; // N
  mafiaAlive: number; // m
  yakuzaAlive: boolean;
  shogunAlive: boolean;
  decidedRole?: string; // headline role, e.g. "SHOGUN" in a 1v1
};

const MAFIA_ROLES: ReadonlySet<string> = new Set(MAFIA_TEAM_ROLES);
const YAKUZA_CLAN_ROLES: ReadonlySet<string> = new Set(["YAKUZA", "SHOGUN"]);

/** Remove the first occurrence of `value` from `arr` (non-mutating). */
function removeOnce(arr: string[], value: string): string[] {
  const i = arr.indexOf(value);
  if (i === -1) return arr;
  return [...arr.slice(0, i), ...arr.slice(i + 1)];
}

/** Multiset equality (order-independent, counts duplicates). */
function multisetEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  let remaining = [...b];
  for (const x of a) {
    const i = remaining.indexOf(x);
    if (i === -1) return false;
    remaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
  }
  return true;
}

/**
 * Decide the winning faction from the roles of the alive players, returning a
 * structured `WinMethod` snapshot of the endgame state, or `null` to continue.
 *
 * This is the single source of truth for the win decision; `decideWinner`
 * delegates to it so the two never drift.
 *
 * @param aliveRoles roles of every alive player (e.g. `["DON", "MAFIA", "CITIZEN"]`)
 * @param context whether we are about to enter night or day — only matters at N = 5
 */
export function describeWin(
  aliveRoles: string[],
  context: WinContext,
): WinMethod | "no_contest" | null {
  const m = aliveRoles.filter((r) => MAFIA_ROLES.has(r)).length;
  const YA = aliveRoles.includes("YAKUZA");
  const SH = aliveRoles.includes("SHOGUN");
  const N = aliveRoles.length;

  const base = {
    aliveTotal: N,
    mafiaAlive: m,
    yakuzaAlive: YA,
    shogunAlive: SH,
  };
  const win = (faction: Winner, decidedRole?: string): WinMethod => ({
    faction,
    decidedRole,
    ...base,
  });

  // No players left at all — total mutual elimination (e.g. the last survivors
  // all voted to leave in a "both leave" vote). Nobody met a win condition, so
  // it is a no-contest. This MUST come first: the Citizens sweep below
  // (`m === 0 && !YA && !SH`) is vacuously true when *nobody* is alive, which
  // would otherwise mis-declare a Citizens win at N = 0.
  if (N === 0) return "no_contest";

  // Global "last faction standing" sweeps (highest priority, any N): if every
  // remaining player belongs to a single faction, that faction has won. Mafia
  // caps at 3 and the Yakuza clan at 3, so a non-town sweep never exceeds N ≤ 6.
  // These also cover N = 1, which the per-N tables below stop short of: two
  // players can die in one night, dropping the count straight past the N = 2
  // boundary (e.g. N=3 `CIT,YA,M` → both CIT and M die → lone `YAKUZA`), so the
  // per-N checks never fire and only the sweep can end the game.
  if (m === 0 && !YA && !SH) return win("citizens"); // only Town remain
  if (N > 0 && m === N) return win("mafia"); // only Mafia remain
  if (N > 0 && m === 0 && aliveRoles.every((r) => YAKUZA_CLAN_ROLES.has(r)))
    return win("yakuza", SH ? "SHOGUN" : "YAKUZA"); // only Yakuza clan remain

  // Nothing else can be decided above 6 players.
  if (N > 6) return null;

  switch (N) {
    case 6:
      // Mafia win iff m = 3 and Yakuza is dead (lone Shogun can't kill).
      if (m === 3 && !YA) return win("mafia");
      return null;

    case 5:
      if (m === 3) {
        // beforeNight exception: the other 2 are exactly DOCTOR + YAKUZA.
        const others = aliveRoles.filter((r) => !MAFIA_ROLES.has(r));
        if (
          context === "beforeNight" &&
          multisetEquals(others, ["DOCTOR", "YAKUZA"])
        ) {
          return null;
        }
        return win("mafia");
      }
      return null;

    case 4: {
      if (m === 3) return win("mafia");
      if (YA && SH) {
        // Exception: the other 2 are exactly DOCTOR + any one Mafia member.
        const others = removeOnce(removeOnce(aliveRoles, "YAKUZA"), "SHOGUN");
        const hasDoctor = others.includes("DOCTOR");
        const hasMafia = others.some((r) => MAFIA_ROLES.has(r));
        if (others.length === 2 && hasDoctor && hasMafia) return null;
        return win("yakuza");
      }
      if (m === 2 && !YA) return win("mafia");
      return null;
    }

    case 3:
      if (m === 2) return win("mafia");
      if (YA && SH) return win("yakuza");
      return null;

    case 2:
      if (m === 2) return win("mafia");
      // The Yakuza/Shogun clan always wins a 1-on-1: lone Yakuza or lone Shogun
      // beats a Townsperson and beats a lone Mafia. (docs §6 N=2 table — this is
      // a declared outcome that takes precedence over §7's lone-YA/SH fall-through.)
      // Record the surviving clan member as the headline role (e.g. "Shogun in 1vs1").
      if (YA || SH) return win("yakuza", SH ? "SHOGUN" : "YAKUZA");
      // Remaining: a lone Mafia vs one Townsperson → Mafia wins.
      if (m === 1) return win("mafia");
      return null;

    default:
      // N <= 1: nothing to decide here (a sweep would already have returned).
      return null;
  }
}

/**
 * Decide the winning faction from the roles of the alive players.
 *
 * @returns the winning faction, or `null` if the game should continue
 */
export function decideWinner(
  aliveRoles: string[],
  context: WinContext,
): GameOutcome | null {
  const result = describeWin(aliveRoles, context);
  if (result === null || result === "no_contest") return result;
  return result.faction;
}

/**
 * Derive a human-readable label for a win method, e.g. "Shogun in 1vs1",
 * "Mafia in 2vs2", "Citizens in 3vs0". Pure — safe to call from the UI later.
 *
 * The matchup is always *winning clan alive* vs *everyone else alive*. The only
 * per-faction difference is how many survivors make up the winning clan:
 *   - mafia:  the alive mafia team
 *   - yakuza: only the surviving Yakuza + Shogun
 *   - citizens: a sweep, so every survivor is town
 */
export function winMethodLabel(method: WinMethod): string {
  const { faction, aliveTotal, mafiaAlive, yakuzaAlive, shogunAlive } = method;

  const clanAlive =
    faction === "mafia"
      ? mafiaAlive
      : faction === "yakuza"
        ? (yakuzaAlive ? 1 : 0) + (shogunAlive ? 1 : 0)
        : aliveTotal;
  const factionLabel =
    faction === "mafia"
      ? "Mafia"
      : faction === "yakuza"
        ? "Yakuza and Shogun"
        : "Citizens";

  return `${clanAlive}vs${aliveTotal - clanAlive}`;
}
