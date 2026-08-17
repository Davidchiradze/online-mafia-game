/**
 * Sports Mafia win conditions (docs/variants/sports/win-conditions.md §7). Two factions →
 * a simple parity rule, with no context sensitivity (the `beforeNight` /
 * `beforeDay` distinction is irrelevant; the signature keeps `context` only for
 * interface compatibility with `GameDefinition.decideWinner`).
 *
 *   N === 0            → no_contest (total mutual elimination)
 *   m === 0            → citizens (all mafia eliminated)
 *   m >= N - m (2m≥N)  → mafia (parity or better)
 *   otherwise          → continue (null)
 *
 * m = living mafia-faction players (DON + MAFIA); N = living role-holders.
 */

import type { Outcome, Role, WinContext, WinMethod } from "../core/types";

const MAFIA_ROLES: ReadonlySet<string> = new Set(["DON", "MAFIA"]);

/**
 * Structured endgame snapshot for Sports. Two factions → `yakuzaAlive` /
 * `shogunAlive` are always false (docs/variants/sports/win-conditions.md §2) and there is no
 * headline `decidedRole`. `context` is ignored (parity is boundary-independent).
 */
export function describeSportsWin(
  aliveRoles: Role[],
  _context: WinContext,
): WinMethod | "no_contest" | null {
  const N = aliveRoles.length;
  if (N === 0) return "no_contest";
  const m = aliveRoles.filter((r) => MAFIA_ROLES.has(r)).length;
  const base = {
    aliveTotal: N,
    mafiaAlive: m,
    yakuzaAlive: false,
    shogunAlive: false,
  };
  if (m === 0) return { faction: "citizens", ...base };
  if (m >= N - m) return { faction: "mafia", ...base };
  return null;
}

export function decideSportsWinner(
  aliveRoles: Role[],
  context: WinContext,
): Outcome | null {
  const result = describeSportsWin(aliveRoles, context);
  if (result === null || result === "no_contest") return result;
  return result.faction;
}
