import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * One row per participant per finished game. Convex can't index into the
 * `gameLogs.players` array, so this child table makes per-player history
 * ("my match history") an efficient indexed query.
 */
export const gameLogPlayers = defineTable({
  gameLogId: v.id("gameLogs"),
  gameId: v.id("games"),
  playerId: v.id("profiles"),
  nickname: v.string(),
  role: v.string(),
  seatNumber: v.optional(v.number()),
  isAlive: v.boolean(),
  finishedAt: v.number(), // denormalized for sorting "my games" by recency
})
  .index("by_playerId", ["playerId"])
  .index("by_gameLogId", ["gameLogId"]);
