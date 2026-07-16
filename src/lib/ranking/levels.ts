import { RANK_LEVELS, type RankLevel } from "@/lib/constants/ranking";

/**
 * Pure level math over the FACEIT-style brackets (no DB, no React — same
 * spirit as `src/lib/game/visibility.ts`). Bounds are inclusive: 750 is
 * Level 2, 751 is Level 3. Ratings below the Level 1 floor clamp to Level 1.
 */

export function getLevelForRating(rating: number): RankLevel {
  for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
    if (rating >= RANK_LEVELS[i].min) return RANK_LEVELS[i];
  }
  return RANK_LEVELS[0];
}

/** Position inside the current level's bracket, 0–1. Level 10 is always 1. */
export function getLevelProgress(rating: number): number {
  const level = getLevelForRating(rating);
  if (level.max === null) return 1;
  const span = level.max - level.min;
  return Math.min(1, Math.max(0, (rating - level.min) / span));
}

/** Points needed to reach the next level, or null at Level 10. */
export function pointsToNextLevel(rating: number): number | null {
  const level = getLevelForRating(rating);
  if (level.max === null) return null;
  return level.max + 1 - Math.max(rating, level.min);
}
