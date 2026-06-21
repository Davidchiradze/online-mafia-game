import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Append-only audit trail for privileged admin/moderation actions
 * (role changes, bans, force-ends, refunds). Written by every mutation/action
 * in convex/admin/** via `writeAudit` (convex/lib/admin.ts).
 */
export const adminAuditLog = defineTable({
  actorProfileId: v.id("profiles"),
  /** Dotted action key, e.g. "role.assign", "user.ban", "game.force_end". */
  action: v.string(),
  /** Stringified id of the affected entity (profile/game), if any. */
  targetId: v.optional(v.string()),
  /** Arbitrary structured context (old/new values, reason, etc.). */
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_actorProfileId", ["actorProfileId"])
  .index("by_action", ["action"]);
