import { defineTable } from "convex/server";
import { v } from "convex/values";

export const nightPhaseSessions = defineTable({
  gameId: v.id("games"),
  nightNumber: v.number(),
  mafiaTarget: v.optional(v.number()),
  yakuzaTarget: v.optional(v.number()),
  healedPlayer: v.optional(v.number()),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_nightNumber", ["gameId", "nightNumber"]);
