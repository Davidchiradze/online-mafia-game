import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameType } from "./games";
import { winMethodValidator } from "./gameLogs";

/**
 * One row per participant per finished game. Convex can't index into the
 * `gameLogs.players` array, so this child table makes per-player history
 * ("my match history") an efficient indexed query.
 *
 * List-card fields (`outcome`, `winner`, `gameType`, `gameName`, `winMethod`) are
 * denormalized here so the paginated history list renders with **no parent join**.
 * The full roster lives on `gameLogs` and is loaded lazily only when a row expands.
 */
export const gameLogPlayers = defineTable({
  gameLogId: v.id("gameLogs"),
  gameId: v.id("games"),
  playerId: v.id("profiles"),
  nickname: v.string(),
  role: v.string(),
  seatNumber: v.optional(v.number()),
  isAlive: v.boolean(),
  startedAt: v.number(), // denormalized for the card's match-duration display
  finishedAt: v.number(), // denormalized for sorting "my games" by recency

  // This player's result, from their faction's perspective.
  faction: v.union(
    v.literal("mafia"),
    v.literal("yakuza"),
    v.literal("citizens"),
    v.literal("serial_killer"),
  ),
  outcome: v.union(
    v.literal("win"),
    v.literal("loss"),
    v.literal("no_contest"),
  ),

  // Denormalized game-level fields for the list card (avoid a parent fetch).
  winner: v.union(
    v.literal("mafia"),
    v.literal("yakuza"),
    v.literal("citizens"),
    v.literal("serial_killer"),
    v.null(),
  ),
  gameType,
  gameName: v.string(),
  winMethod: v.optional(winMethodValidator),

  // ELO snapshot for this game (see /docs/ranking-system.md). Absent when the
  // game type is unrated or the row predates the ratings backfill.
  ratingDelta: v.optional(v.number()), // clipped delta actually applied
  ratingAfter: v.optional(v.number()), // player's rating after this game
  tableAvgRating: v.optional(v.number()), // rounded table average (T)
})
  .index("by_playerId", ["playerId"])
  .index("by_playerId_outcome", ["playerId", "outcome"])
  .index("by_gameLogId", ["gameLogId"]);
