import { defineTable } from "convex/server";
import { v } from "convex/values";

export const profiles = defineTable({
  accountId: v.string(),
  email: v.optional(v.string()),
  username: v.optional(v.string()),
  name: v.optional(v.string()),
  nickname: v.string(),
  avatar: v.optional(v.string()),
  role: v.optional(v.string()),
  amount: v.optional(v.string()),
  verified: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_accountId", ["accountId"])
  .index("by_email", ["email"])
  .index("by_nickname", ["nickname"]);
