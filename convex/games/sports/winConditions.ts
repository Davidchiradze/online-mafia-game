/**
 * Sports Mafia win conditions (docs/sports-mafia.md §6). Two factions →
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

import type { Outcome, Role, WinContext } from "../core/types";

const MAFIA_ROLES: ReadonlySet<string> = new Set(["DON", "MAFIA"]);

export function decideSportsWinner(
  aliveRoles: Role[],
  _context: WinContext,
): Outcome | null {
  const N = aliveRoles.length;
  if (N === 0) return "no_contest";
  const m = aliveRoles.filter((r) => MAFIA_ROLES.has(r)).length;
  if (m === 0) return "citizens";
  if (m >= N - m) return "mafia";
  return null;
}
