import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Global community chat — a single site-wide channel (no per-room/game scope).
 * Author identity is denormalized at send-time (nickname/avatar/role) so the
 * reactive `list` query renders without an O(messages) profile fan-out, and so
 * a later nickname/role change doesn't retro-edit historical messages.
 *
 * Moderation is soft-delete: `deletedAt` is set instead of removing the row, so
 * the UI can render "message removed" in place. Old rows are pruned by the
 * daily cron in convex/community/maintenance.ts.
 */
export const communityMessages = defineTable({
  authorId: v.id("profiles"),
  authorNickname: v.string(),
  authorAvatar: v.optional(v.string()),
  authorRole: v.optional(v.string()),
  text: v.string(),
  createdAt: v.number(),
  // Soft-delete (admin/moderator). Absent ⇒ visible.
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("profiles")),
})
  // List the channel newest-last; prune the oldest.
  .index("by_createdAt", ["createdAt"])
  // Rate-limit check: this author's most recent message.
  .index("by_author", ["authorId", "createdAt"]);
