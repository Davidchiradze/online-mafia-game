import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gameType = v.union(
  v.literal("sports_mafia"),
  v.literal("city_mafia"),
  v.literal("japanese_mafia"),
  // Legacy value — renamed to "sports_mafia". Kept in the union ONLY so any
  // historical rows still validate on deploy. Not creatable (see
  // lobby/games:create). Remove after `npx convex run
  // migrations:renameTraditionalGameType` has run in every deployment.
  v.literal("traditional"),
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
})
  .index("by_hostId", ["hostId"])
  .index("by_code", ["code"])
  .index("by_gameStatus", ["gameStatus"]);
