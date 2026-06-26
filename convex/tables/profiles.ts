import { defineTable } from "convex/server";
import { v } from "convex/values";

export const profiles = defineTable({
  accountId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  // Display name, synced from PHP `username` on every profile sync.
  nickname: v.string(),
  // DEPRECATED: merged into `nickname`; no longer written. Kept optional so
  // existing rows validate until the clear migration runs, then remove this
  // line and deploy. See convex/migrations.ts:clearLegacyUsername.
  username: v.optional(v.string()),
  avatar: v.optional(v.string()),
  // App-level ACCESS role (Convex-owned: user/moderator/admin), unrelated to
  // PHP account role or in-game roles. Absent ⇒ "user". See convex/lib/access.ts.
  // NOTE: kept as a loose string until the stale-value clear migration runs;
  // tighten to `accessRoleValidator` afterward (see convex/migrations.ts).
  role: v.optional(v.string()),
  amount: v.optional(v.string()),
  // Subscription synced from PHP (mafia.ge). `active` is PHP's snapshot
  // (packageId>0 && to>now), refreshed on every profile sync; `from`/`to`
  // are MySQL datetime strings kept for display only. See convex/auth/profiles.ts.
  subscription: v.optional(
    v.object({
      packageId: v.number(),
      from: v.optional(v.string()),
      to: v.optional(v.string()),
      active: v.boolean(),
    }),
  ),
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
