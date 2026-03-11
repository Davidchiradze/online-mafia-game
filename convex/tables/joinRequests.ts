import { defineTable } from "convex/server";
import { v } from "convex/values";

export const joinRequestStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected"),
);

export const joinRequests = defineTable({
  gameId: v.id("games"),
  requesterId: v.id("users"),
  requesterNickname: v.string(),
  status: joinRequestStatus,
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_requesterId", ["gameId", "requesterId"])
  .index("by_gameId_status", ["gameId", "status"]);
