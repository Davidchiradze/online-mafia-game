import type { DatabaseReader, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { Faction } from "./roles";
import { RATING_CONFIG, type RatingConfig } from "./constants";
import { computeRatingDelta } from "./ratings";

type GameType = Doc<"games">["gameType"];
type Outcome = "win" | "loss" | "no_contest";

/**
 * Reusable data-access + ELO helpers for the `playerRatings` table (see
 * /docs/ranking-system.md). Ratings are namespaced per game type; a missing
 * row reads as the config's `start` (there is no "unranked" state).
 *
 * Split into two layers:
 *   - single-row helpers (`getPlayerRating`, `getPlayerRatingValues`,
 *     `upsertPlayerRating`) usable anywhere, and
 *   - the archive two-pass (`loadRatingSnapshot` + `applyPlayerRating`) that
 *     keeps `archiveGameLog` free of rating mechanics.
 */

/** A player's raw rating row for a game type, or null if they have none yet. */
export function getPlayerRating(
  db: DatabaseReader,
  playerId: Id<"profiles">,
  gameType: GameType,
): Promise<Doc<"playerRatings"> | null> {
  return db
    .query("playerRatings")
    .withIndex("by_playerId_gameType", (q) =>
      q.eq("playerId", playerId).eq("gameType", gameType),
    )
    .unique();
}

/** Default rating when a player has no row for this game type. */
export function defaultRating(gameType: GameType): number {
  return RATING_CONFIG[gameType]?.start ?? 1000;
}

/**
 * A player's current + peak rating for a game type, falling back to the config
 * default when they have no row — no "unranked" state.
 */
export async function getPlayerRatingValues(
  db: DatabaseReader,
  playerId: Id<"profiles">,
  gameType: GameType,
): Promise<{ rating: number; peakRating: number }> {
  const row = await getPlayerRating(db, playerId, gameType);
  const fallback = defaultRating(gameType);
  return {
    rating: row?.rating ?? fallback,
    peakRating: row?.peakRating ?? fallback,
  };
}

/**
 * Create or update a player's rating row to `rating`, bumping peak. Pass the
 * already-fetched `existingRow` (null to insert) so callers that pre-read in a
 * batch don't pay a second lookup. A brand-new row's peak is floored at
 * `startRating`, matching the "missing row reads as start" rule.
 */
export async function upsertPlayerRating(
  ctx: MutationCtx,
  args: {
    playerId: Id<"profiles">;
    gameType: GameType;
    existingRow: Doc<"playerRatings"> | null;
    rating: number;
    startRating: number;
  },
): Promise<void> {
  const { playerId, gameType, existingRow, rating, startRating } = args;
  if (existingRow) {
    await ctx.db.patch(existingRow._id, {
      rating,
      peakRating: Math.max(existingRow.peakRating, rating),
    });
  } else {
    await ctx.db.insert("playerRatings", {
      playerId,
      gameType,
      rating,
      peakRating: Math.max(startRating, rating),
    });
  }
}

/**
 * Pre-game rating snapshot for a whole roster — the input to per-player delta
 * computation. All deltas (and the table average T) are derived from ratings
 * BEFORE the game, then applied together, so the result is order-independent.
 */
export type RatingSnapshot = {
  config: RatingConfig;
  gameType: GameType;
  /** Mean of all role-holders' pre-game ratings (host excluded, self included). */
  tableAvg: number;
  preRatings: Map<
    Id<"profiles">,
    { row: Doc<"playerRatings"> | null; rating: number }
  >;
};

/**
 * Archive pass 1: load every roster player's pre-game rating and compute the
 * table average once. Returns null for unrated game types or an empty roster,
 * signalling callers to skip all rating work.
 */
export async function loadRatingSnapshot(
  db: DatabaseReader,
  gameType: GameType,
  playerIds: Id<"profiles">[],
): Promise<RatingSnapshot | null> {
  const config = RATING_CONFIG[gameType];
  if (!config || playerIds.length === 0) return null;

  const preRatings: RatingSnapshot["preRatings"] = new Map();
  for (const playerId of playerIds) {
    const row = await getPlayerRating(db, playerId, gameType);
    preRatings.set(playerId, { row, rating: row?.rating ?? config.start });
  }

  let sum = 0;
  for (const { rating } of preRatings.values()) sum += rating;

  return { config, gameType, tableAvg: sum / preRatings.size, preRatings };
}

/** Per-game rating fields stamped on a `gameLogPlayers` row. */
export type RatingFields = {
  ratingDelta?: number;
  ratingAfter?: number;
  tableAvgRating?: number;
};

/**
 * Archive pass 2: apply one player's rating from a snapshot — upserts their
 * `playerRatings` row and returns the fields to stamp on their
 * `gameLogPlayers` row. Returns empty fields when there's no snapshot
 * (unrated) or the player isn't in it.
 */
export async function applyPlayerRating(
  ctx: MutationCtx,
  snapshot: RatingSnapshot | null,
  playerId: Id<"profiles">,
  faction: Faction,
  outcome: Outcome,
): Promise<RatingFields> {
  if (!snapshot) return {};
  const pre = snapshot.preRatings.get(playerId);
  if (!pre) return {};

  const { delta, after } = computeRatingDelta(
    snapshot.config,
    faction,
    outcome,
    pre.rating,
    snapshot.tableAvg,
  );

  await upsertPlayerRating(ctx, {
    playerId,
    gameType: snapshot.gameType,
    existingRow: pre.row,
    rating: after,
    startRating: snapshot.config.start,
  });

  return {
    ratingDelta: delta,
    ratingAfter: after,
    tableAvgRating: Math.round(snapshot.tableAvg),
  };
}
