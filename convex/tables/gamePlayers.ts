import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gamePlayers = defineTable({
  gameId: v.id("games"),
  playerId: v.id("profiles"),
  nickname: v.string(),
  seatNumber: v.optional(v.number()),
  isAlive: v.boolean(),
  fouls: v.number(),
  foulSpeakStartedAt: v.optional(v.number()),
  // Day round for which this player is muted from their main day speech after a
  // 3rd foul (Sports `thirdFoulSpeakingBan`, docs/sports-mafia.md §4.2). Optional
  // and additive — Japanese never sets it, so existing rows validate unchanged.
  foulSpeakingBanRound: v.optional(v.number()),
  state: v.optional(v.string()),
  isReady: v.optional(v.boolean()),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_playerId", ["gameId", "playerId"]);
