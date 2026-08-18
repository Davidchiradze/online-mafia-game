import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "./constants";

/**
 * Every faction any registered variant can deal.
 *
 * `serial_killer` is a faction of exactly one player who is hostile to both
 * other sides (docs/variants/serial_killer/win-conditions.md §2). It is declared
 * here ahead of the variant that deals it, so the schema validators and the
 * three `Record<Faction, …>` maps widen in one reviewable step.
 *
 * NOTE: `roleToFaction` below still answers `"citizens"` for `SERIAL_KILLER`,
 * because it is the variant-blind fallback and no registered deck contains that
 * role yet. Prefer `definition.roleToFaction`, which is authoritative per
 * variant.
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
