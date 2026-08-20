import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gameType = v.union(
  v.literal("sports_mafia"),
  v.literal("city_mafia"),
  v.literal("japanese_mafia"),
  v.literal("serial_killer_mafia"),
);

export const gameStatus = v.union(
  v.literal("not_started"),
  v.literal("playing"),
  v.literal("finished"),
);

export const games = defineTable({
  code: v.string(),
  name: v.string(),
  hostId: v.id("profiles"),
  gameType,
  gameStatus,
  maxPlayers: v.number(),
  isPrivate: v.boolean(),
  pin: v.optional(v.string()),
})
  .index("by_hostId", ["hostId"])
  .index("by_code", ["code"])
  .index("by_gameStatus", ["gameStatus"]);
