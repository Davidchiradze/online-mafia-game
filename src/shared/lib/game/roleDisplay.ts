import { Skull, Swords, Shield, type LucideIcon } from "lucide-react";
import {
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
  JAPANESE_MAFIA_ROLE_LABEL,
} from "@/shared/lib/constants/game";
import { getGameDefinition } from "@convex/games/registry";

export type Faction = "mafia" | "yakuza" | "citizens";

const MAFIA_ROLE_SET = new Set<string>(MAFIA_TEAM_ROLES);
const YAKUZA_ROLE_SET = new Set<string>(YAKUZA_TEAM_ROLES);

/**
 * Map a role to its faction using the GLOBAL role sets.
 *
 * Variant-blind, and correct only while every variant agrees on what a role
 * means — which they do today. Prefer `factionForRole` wherever the variant is
 * known; this stays for the callers that genuinely have no game in hand.
 */
export function roleToFaction(role: string): Faction {
  if (MAFIA_ROLE_SET.has(role)) return "mafia";
  if (YAKUZA_ROLE_SET.has(role)) return "yakuza";
  return "citizens";
}

/**
 * Map a role to its faction **according to the variant being displayed**.
 *
 * The definition owns this mapping, so a future variant that reuses a role name
 * for a different side colours correctly instead of inheriting the Japanese
 * answer. Falls back to the global map for an unregistered game type rather
 * than throwing — this is card decoration, and no colour is worth taking a
 * profile page down.
 */
export function factionForRole(gameType: string, role: string): Faction {
  try {
    return getGameDefinition(gameType).roleToFaction(role);
  } catch {
    return roleToFaction(role);
  }
}

/** Lucide icon for a faction — render as `const Icon = factionIcon(f); <Icon />`. */
export function factionIcon(faction: Faction): LucideIcon {
  switch (faction) {
    case "mafia":
      return Skull;
    case "yakuza":
      return Swords;
    default:
      return Shield;
  }
}

/** Tailwind classes for a faction badge (bg + text + border). */
export function factionBadgeClass(faction: Faction): string {
  switch (faction) {
    case "mafia":
      return "bg-zinc-800/80 text-zinc-200 border-zinc-700/50";
    case "yakuza":
      return "bg-purple-900/30 text-purple-300 border-purple-700/40";
    default:
      return "bg-rose-900/30 text-rose-300 border-rose-800/40";
  }
}

/** Human label for a role, e.g. `DON` → "Don", `DOCTOR` → "Doctor". */
export function roleLabel(role: string): string {
  const known =
    JAPANESE_MAFIA_ROLE_LABEL[role as keyof typeof JAPANESE_MAFIA_ROLE_LABEL];
  if (known) return known;
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
