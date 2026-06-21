import { defineTable } from "convex/server";
import { v } from "convex/values";

export const profiles = defineTable({
  accountId: v.string(),
  email: v.optional(v.string()),
  username: v.optional(v.string()),
  name: v.optional(v.string()),
  nickname: v.string(),
  avatar: v.optional(v.string()),
  // App-level ACCESS role (Convex-owned: user/moderator/admin), unrelated to
  // PHP account role or in-game roles. Absent ⇒ "user". See convex/lib/access.ts.
  // NOTE: kept as a loose string until the stale-value clear migration runs;
  // tighten to `accessRoleValidator` afterward (see convex/migrations.ts).
  role: v.optional(v.string()),
  amount: v.optional(v.string()),
  // Convex-owned moderation fields (never synced from PHP).
  bannedAt: v.optional(v.number()),
  banReason: v.optional(v.string()),
  verified: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_accountId", ["accountId"])
  .index("by_email", ["email"])
  .index("by_nickname", ["nickname"])
  // Full-text search over nickname for the admin user list.
  .searchIndex("search_nickname", { searchField: "nickname" });
