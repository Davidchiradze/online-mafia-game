import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gamePlayerRoles = defineTable({
  gameId: v.id("games"),
  playerId: v.id("profiles"),
  role: v.string(),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_playerId", ["gameId", "playerId"]);
