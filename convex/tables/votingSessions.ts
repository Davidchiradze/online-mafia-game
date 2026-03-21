import { defineTable } from "convex/server";
import { v } from "convex/values";

export const votingSessions = defineTable({
  gameId: v.id("games"),
  roundNumber: v.number(),
  candidates: v.array(v.number()),
  currentCandidateIndex: v.optional(v.number()),
  votingActive: v.optional(v.boolean()),
  votingStartedAt: v.optional(v.string()),
  isTieBreak: v.optional(v.boolean()),
  tieBreakRound: v.optional(v.number()),
  previousTiedCandidates: v.optional(v.array(v.number())),
  bothLeaveVoteActive: v.optional(v.boolean()),
  playersWhoVoted: v.optional(v.array(v.number())),
}).index("by_gameId", ["gameId"]);
