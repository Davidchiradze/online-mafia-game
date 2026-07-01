import { defineTable } from "convex/server";
import { v } from "convex/values";
import { winMethodValidator } from "./gameLogs";

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
  withoutSelfJustification: v.optional(v.boolean()),
  startedAt: v.optional(v.number()), // ms epoch — set when play begins (startGame)
  winner: v.optional(
    v.union(v.literal("mafia"), v.literal("yakuza"), v.literal("citizens")),
  ),
  // Structured endgame snapshot captured when the winner is first decided.
  winMethod: v.optional(winMethodValidator),
}).index("by_gameId", ["gameId"]);
