import { RATING_CONFIG } from "@convex/lib/constants";
import { REGISTERED_GAME_TYPES } from "@convex/games/registry";
import { GAME_TYPES } from "@/shared/lib/constants/game";

/**
 * Which variants have a ladder, derived rather than listed.
 *
 * A variant is rated exactly when it has a `RATING_CONFIG` entry — the same
 * test `archiveGameLog` applies (/docs/ranking-system.md §13). Deriving it here
 * means a new rated variant appears in every ladder surface on its own, and an
 * unrated one can never be offered a board that would always be empty.
 *
 * Both imports are client-safe: `convex/lib/constants.ts` has no imports at all
 * and the registry pulls only the pure definitions. `src/` may import from
 * `convex/`; it is the other direction that is forbidden.
 */

export type RatedGameType = (typeof GAME_TYPES)[number];

/**
 * Rated variants in REGISTRATION order, which is also display order. Not
 * `GAME_TYPES` order — that list is alphabetical-ish and would put a newly
 * rated variant first, defaulting every ladder surface to a board that starts
 * empty (Sports has no backfill, /docs/variants/sports/rating.md §5).
 */
export const RATED_GAME_TYPES: readonly RatedGameType[] =
  REGISTERED_GAME_TYPES.filter(
    (id): id is RatedGameType =>
      GAME_TYPES.includes(id as RatedGameType) &&
      RATING_CONFIG[id as RatedGameType] !== undefined,
  );

/** The ladder shown before a viewer picks one. */
export const DEFAULT_RATED_GAME_TYPE: RatedGameType = RATED_GAME_TYPES[0];

/** Whether a string names a variant that has a ladder. */
export function isRatedGameType(value: string): value is RatedGameType {
  return RATED_GAME_TYPES.includes(value as RatedGameType);
}
