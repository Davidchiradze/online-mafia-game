import { defineTable } from "convex/server";
import { v } from "convex/values";

export const votes = defineTable({
  votingSessionId: v.id("votingSessions"),
  voterSeat: v.number(),
  seatNumber: v.optional(v.number()),
  isAutoVote: v.boolean(),
  isBothLeave: v.boolean(),
})
  .index("by_votingSessionId", ["votingSessionId"])
  .index("by_votingSessionId_voterSeat", ["votingSessionId", "voterSeat"]);
