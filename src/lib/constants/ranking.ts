/**
 * FACEIT-style skill levels for the ELO ranking system (display-only — the
 * server never computes levels; see /docs/ranking-system.md §5–§6).
 *
 * One source of truth per visual intent, mirroring `factions.ts`: raw hex
 * values feed SVG strokes (which need literal color strings), Tailwind classes
 * are used in markup. Color groups: zinc (L1) → emerald (L2–3) → amber (L4–7)
 * → orange (L8–9) → red (L10), the same 400-series hues as the app palette.
 */

export type RankLevel = {
  level: number;
  /** Inclusive lower ELO bound. */
  min: number;
  /** Inclusive upper ELO bound; null = open-ended (Level 10). */
  max: number | null;
  hex: string;
  textClass: string;
};

/** Default ELO shown for players with no rated games (no "unranked" state). */
export const DEFAULT_RATING = 1000;

export const RANK_LEVELS: readonly RankLevel[] = [
  { level: 1, min: 100, max: 500, hex: "#a1a1aa", textClass: "text-zinc-400" },
  { level: 2, min: 501, max: 750, hex: "#34d399", textClass: "text-emerald-400" },
  { level: 3, min: 751, max: 900, hex: "#34d399", textClass: "text-emerald-400" },
  { level: 4, min: 901, max: 1050, hex: "#fbbf24", textClass: "text-amber-400" },
  { level: 5, min: 1051, max: 1200, hex: "#fbbf24", textClass: "text-amber-400" },
  { level: 6, min: 1201, max: 1350, hex: "#fbbf24", textClass: "text-amber-400" },
  { level: 7, min: 1351, max: 1530, hex: "#fbbf24", textClass: "text-amber-400" },
  { level: 8, min: 1531, max: 1750, hex: "#fb923c", textClass: "text-orange-400" },
  { level: 9, min: 1751, max: 2000, hex: "#fb923c", textClass: "text-orange-400" },
  { level: 10, min: 2001, max: null, hex: "#f87171", textClass: "text-red-400" },
];
