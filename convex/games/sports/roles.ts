/**
 * Sports Mafia roles, deck, teams, and faction mapping
 * (docs/variants/sports/rules.md §2). Two factions only — `mafia` (DON + 2×MAFIA) and
 * `citizens` (DETECTIVE + 6×CITIZEN). No Yakuza clan, Doctor, or Right Hand.
 */

import type { Faction, Role } from "../core/types";

/** Every role Sports can assign. */
export const SPORTS_MAFIA_ROLES: readonly Role[] = [
  "DON",
  "MAFIA",
  "DETECTIVE",
  "CITIZEN",
];

/** The deck dealt at card-picking (length 10 === seatCount). */
export const SPORTS_MAFIA_ROLE_DISTRIBUTION: readonly Role[] = [
  "DON",
  "MAFIA",
  "MAFIA",
  "DETECTIVE",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
];

/** The mafia team (who meet/see together). There is no yakuza team. */
export const SPORTS_MAFIA_TEAM_ROLES: readonly Role[] = ["DON", "MAFIA"];

const MAFIA_ROLE_SET: ReadonlySet<string> = new Set(SPORTS_MAFIA_TEAM_ROLES);

/** DON / MAFIA → mafia; everything else → citizens. */
export function sportsRoleToFaction(role: Role): Faction {
  return MAFIA_ROLE_SET.has(role) ? "mafia" : "citizens";
}
