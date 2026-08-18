/**
 * Centralized faction colors for the admin dashboard charts & badges.
 *
 * One source of truth so every visualization (donut slices, legend dots,
 * win badges) renders a faction in the same hue. Tailwind classes are used in
 * markup; raw hex values feed Recharts (which needs literal color strings, not
 * class names). Hues track the app palette: mafia = red accent, citizens =
 * emerald (the "active/alive" green), yakuza = violet (matches the avatar
 * gradient's purple), serial killer = amber (the one hue in
 * `CHART_SERIES_HEX` no faction had claimed, and the only warm colour left that
 * reads as neither "town" nor "mafia" — which is the point: it is a faction of
 * one, allied to nobody).
 */

export type Faction = "mafia" | "yakuza" | "citizens" | "serial_killer";

export const FACTION_HEX: Record<Faction, string> = {
  mafia: "#f87171", // red-400
  citizens: "#34d399", // emerald-400
  yakuza: "#a78bfa", // violet-400
  serial_killer: "#fbbf24", // amber-400
};

export const FACTION_TEXT: Record<Faction, string> = {
  mafia: "text-red-400",
  citizens: "text-emerald-400",
  yakuza: "text-violet-400",
  serial_killer: "text-amber-400",
};

export const FACTION_BADGE: Record<Faction, string> = {
  mafia: "bg-red-500/15 text-red-400",
  citizens: "bg-emerald-500/15 text-emerald-400",
  yakuza: "bg-violet-500/15 text-violet-400",
  serial_killer: "bg-amber-500/15 text-amber-400",
};

/** Ordered hues for non-faction categorical charts (e.g. games-by-type). */
export const CHART_SERIES_HEX = [
  "#f87171", // red-400
  "#34d399", // emerald-400
  "#a78bfa", // violet-400
  "#fbbf24", // amber-400
  "#60a5fa", // blue-400
] as const;
