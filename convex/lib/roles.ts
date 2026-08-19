import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "./constants";

/**
 * Every faction any registered variant can deal.
 *
 * `serial_killer` is a faction of exactly one player who is hostile to both
 * other sides (docs/variants/serial_killer/win-conditions.md §2), dealt by
 * `serial_killer_mafia` and rated since 2026-08-19.
 *
 * NOTE: `roleToFaction` below answers `"citizens"` for `SERIAL_KILLER` — and
 * that is now a real divergence, not a placeholder for an undealt role. It stays
 * because this function is the variant-BLIND fallback: it knows role names, not
 * which game is being played. **Prefer `definition.roleToFaction`**, which is
 * authoritative per variant, and `factionForRole(gameType, role)` on the client.
 * `archiveGameLog` resolves the definition first, so no seat is ever rated off
 * this answer; display code that skips it will badge a Serial Killer as town.
 */
export type Faction = "mafia" | "yakuza" | "citizens" | "serial_killer";

const MAFIA_ROLE_SET: ReadonlySet<string> = new Set(MAFIA_TEAM_ROLES);
const YAKUZA_ROLE_SET: ReadonlySet<string> = new Set(YAKUZA_TEAM_ROLES);

/** Map a role to its faction. Anything that isn't Mafia/Yakuza is a Citizen. */
export function roleToFaction(role: string): Faction {
  if (MAFIA_ROLE_SET.has(role)) return "mafia";
  if (YAKUZA_ROLE_SET.has(role)) return "yakuza";
  return "citizens";
}
