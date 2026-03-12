import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gameSpectators = defineTable({
  gameId: v.id("games"),
  userId: v.id("profiles"),
  nickname: v.string(),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_userId", ["gameId", "userId"]);
