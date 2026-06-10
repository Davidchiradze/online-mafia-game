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

const MAFIA_ROLES: ReadonlySet<string> = new Set(MAFIA_TEAM_ROLES);

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
 * Decide the winning faction from the roles of the alive players.
 *
 * @param aliveRoles roles of every alive player (e.g. `["DON", "MAFIA", "CITIZEN"]`)
 * @param context whether we are about to enter night or day — only matters at N = 5
 * @returns the winning faction, or `null` if the game should continue
 */
export function decideWinner(
  aliveRoles: string[],
  context: WinContext,
): Winner | null {
  const m = aliveRoles.filter((r) => MAFIA_ROLES.has(r)).length;
  const YA = aliveRoles.includes("YAKUZA");
  const SH = aliveRoles.includes("SHOGUN");
  const N = aliveRoles.length;

  // Global Citizens sweep (highest priority, any N).
  if (m === 0 && !YA && !SH) return "citizens";

  // Nothing else can be decided above 6 players.
  if (N > 6) return null;

  switch (N) {
    case 6:
      // Mafia win iff m = 3 and Yakuza is dead (lone Shogun can't kill).
      if (m === 3 && !YA) return "mafia";
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
        return "mafia";
      }
      return null;

    case 4: {
      if (m === 3) return "mafia";
      if (YA && SH) {
        // Exception: the other 2 are exactly DOCTOR + any one Mafia member.
        const others = removeOnce(removeOnce(aliveRoles, "YAKUZA"), "SHOGUN");
        const hasDoctor = others.includes("DOCTOR");
        const hasMafia = others.some((r) => MAFIA_ROLES.has(r));
        if (others.length === 2 && hasDoctor && hasMafia) return null;
        return "yakuza";
      }
      if (m === 2 && !YA) return "mafia";
      return null;
    }

    case 3:
      if (m === 2) return "mafia";
      if (YA && SH) return "yakuza";
      return null;

    case 2:
      if (m === 2) return "mafia";
      // The Yakuza/Shogun clan always wins a 1-on-1: lone Yakuza or lone Shogun
      // beats a Townsperson and beats a lone Mafia. (docs §6 N=2 table — this is
      // a declared outcome that takes precedence over §7's lone-YA/SH fall-through.)
      if (YA || SH) return "yakuza";
      // Remaining: a lone Mafia vs one Townsperson → Mafia wins.
      if (m === 1) return "mafia";
      return null;

    default:
      // N <= 1: nothing to decide here (a sweep would already have returned).
      return null;
  }
}
