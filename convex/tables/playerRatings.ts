import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameType } from "./games";

/**
 * Per-player ELO rating, namespaced by game type — each rated game variant
 * has its own ladder (see /docs/ranking-system.md). Rows are created lazily
 * inside `archiveGameLog` on a player's first rated game; a missing row reads
 * as the default rating (1000 / Level 4) — there is no "unranked" state.
 *
 * Only current state lives here. The per-game snapshot (`ratingDelta`,
 * `ratingAfter`, `tableAvgRating`) is denormalized onto `gameLogPlayers`.
 */
export const playerRatings = defineTable({
  playerId: v.id("profiles"),
  gameType,
  rating: v.number(),
  peakRating: v.number(),
})
  // O(1) "my rating for this game type" lookup.
  .index("by_playerId_gameType", ["playerId", "gameType"])
  // Pre-sorted leaderboard scan within a game type.
  .index("by_gameType_rating", ["gameType", "rating"]);
