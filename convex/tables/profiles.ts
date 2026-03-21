import { defineTable } from "convex/server";
import { v } from "convex/values";

export const profiles = defineTable({
  userId: v.id("users"),
  email: v.string(),
  nickname: v.string(),
  verified: v.boolean(),
})
  .index("by_userId", ["userId"])
  .index("by_email", ["email"])
  .index("by_nickname", ["nickname"]);
