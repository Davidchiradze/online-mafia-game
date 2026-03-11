import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gamePlayers = defineTable({
  gameId: v.id("games"),
  playerId: v.id("users"),
  nickname: v.string(),
  seatNumber: v.optional(v.number()),
  isAlive: v.boolean(),
  fouls: v.number(),
  foulSpeakStartedAt: v.optional(v.number()),
  state: v.optional(v.string()),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_playerId", ["gameId", "playerId"]);
