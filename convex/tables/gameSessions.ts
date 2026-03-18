import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gameSessions = defineTable({
  gameId: v.id("games"),
  gamePhase: v.string(),
  isFinished: v.boolean(),
  currentNightNumber: v.number(),
  currentSpeakerIndex: v.optional(v.number()),
  dayRoundOpenerIndex: v.optional(v.number()),
  foulEliminationOccurred: v.optional(v.boolean()),
  nominatedPlayers: v.array(v.number()),
  speakerStartedAt: v.optional(v.string()),
  speakingOrder: v.array(v.number()),
}).index("by_gameId", ["gameId"]);
