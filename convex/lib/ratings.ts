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
 *          so the recorded delta is clipped by construction. A faction the
 *          config does not price moves nothing (see below).
 */
export function computeRatingDelta(
  config: RatingConfig,
  faction: Faction,
  outcome: "win" | "loss" | "no_contest",
  rating: number,
  tableAvg: number,
): { delta: number; after: number } {
  if (outcome === "no_contest") return { delta: 0, after: rating };

  // `deltas` only holds the factions this variant uses. Sports has no yakuza,
  // so it has no yakuza payout to look up.
  //
  // If the faction is missing, give 0 instead of crashing. This code runs
  // inside `archiveGameLog`. In Convex, if anything in a mutation throws, every
  // write that mutation made is undone — so the whole game log would be lost.
  // A rating that does not move is a small problem. A game with no record at
  // all is a big one.
  //
  // This should never happen: tests/structure/ratedVariants.test.ts fails the
  // build if a variant's payouts do not match its factions.
  const payouts = config.deltas[faction];
  if (!payouts) return { delta: 0, after: rating };

  const base = payouts[outcome];
  const { divisor, cap } = config.tableAdjustment;
  const b = Math.max(
    -cap,
    Math.min(cap, Math.round((tableAvg - rating) / divisor)),
  );
  const after = Math.max(config.floor, rating + base + b);
  return { delta: after - rating, after };
}
