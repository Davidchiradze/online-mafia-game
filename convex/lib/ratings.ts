import type { RatingConfig } from "./constants";
import type { Faction } from "./roles";

/**
 * Pure ELO delta for one player in one finished game — the single formula
 * shared by the live path (`archiveGameLog`) and the backfill migration, so
 * the two can never drift. See /docs/ranking-system.md §3.
 *
 *   ΔR = base(faction, outcome) + b
 *   b  = clamp(round((T − R) / divisor), −cap, +cap)
 *
 * @param rating   R — the player's rating BEFORE this game
 * @param tableAvg T — unrounded mean of ALL role-holders' pre-game ratings
 *                 (host excluded, self included)
 * @returns the clipped delta actually applied and the resulting rating;
 *          `after` never drops below the floor, and `delta = after − rating`
 *          so the recorded delta is clipped by construction.
 */
export function computeRatingDelta(
  config: RatingConfig,
  faction: Faction,
  outcome: "win" | "loss" | "no_contest",
  rating: number,
  tableAvg: number,
): { delta: number; after: number } {
  if (outcome === "no_contest") return { delta: 0, after: rating };

  const base = config.deltas[faction][outcome];
  const { divisor, cap } = config.tableAdjustment;
  const b = Math.max(
    -cap,
    Math.min(cap, Math.round((tableAvg - rating) / divisor)),
  );
  const after = Math.max(config.floor, rating + base + b);
  return { delta: after - rating, after };
}
