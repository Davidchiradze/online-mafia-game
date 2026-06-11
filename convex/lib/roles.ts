import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "./constants";

export type Faction = "mafia" | "yakuza" | "citizens";

const MAFIA_ROLE_SET: ReadonlySet<string> = new Set(MAFIA_TEAM_ROLES);
const YAKUZA_ROLE_SET: ReadonlySet<string> = new Set(YAKUZA_TEAM_ROLES);

/** Map a role to its faction. Anything that isn't Mafia/Yakuza is a Citizen. */
export function roleToFaction(role: string): Faction {
  if (MAFIA_ROLE_SET.has(role)) return "mafia";
  if (YAKUZA_ROLE_SET.has(role)) return "yakuza";
  return "citizens";
}
