/**
 * Serial Killer Mafia roles, deck, teams, and faction mapping
 * (docs/variants/serial_killer/rules.md §2).
 *
 * Three factions: `mafia` (DON + 2×MAFIA), `serial_killer` (exactly one player,
 * hostile to everyone), and `citizens` (DETECTIVE + DOCTOR + 5×CITIZEN). No
 * Yakuza clan — the Serial Killer occupies that structural slot without being a
 * team.
 */

import type { Faction, Role } from "../core/types";

/** Every role Serial Killer Mafia can assign. */
export const SERIAL_KILLER_ROLES: readonly Role[] = [
  "DON",
  "MAFIA",
  "SERIAL_KILLER",
  "DETECTIVE",
  "DOCTOR",
  "CITIZEN",
];

/** The deck dealt at card-picking (length 11 === seatCount). */
export const SERIAL_KILLER_ROLE_DISTRIBUTION: readonly Role[] = [
  "DON",
  "MAFIA",
  "MAFIA",
  "SERIAL_KILLER",
  "DETECTIVE",
  "DOCTOR",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
];

/**
 * The mafia team — who meet and see each other.
 *
 * There is deliberately NO serial-killer team. `definition.teams` is what
 * `getVisible` reads to decide teammate visibility, so a role in no team gets
 * "no teammates" BY RULE. A one-member team here would be harmless today but
 * would state something false: the Serial Killer has no allies to reveal.
 */
export const SERIAL_KILLER_MAFIA_TEAM_ROLES: readonly Role[] = ["DON", "MAFIA"];

const MAFIA_ROLE_SET: ReadonlySet<string> = new Set(
  SERIAL_KILLER_MAFIA_TEAM_ROLES,
);

/** DON / MAFIA → mafia; SERIAL_KILLER → its own faction; everything else → citizens. */
export function serialKillerRoleToFaction(role: Role): Faction {
  if (MAFIA_ROLE_SET.has(role)) return "mafia";
  if (role === "SERIAL_KILLER") return "serial_killer";
  return "citizens";
}
