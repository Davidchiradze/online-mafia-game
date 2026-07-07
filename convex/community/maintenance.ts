import { internalMutation } from "../_generated/server";
import { COMMUNITY_CHAT } from "../lib/constants";

/**
 * Daily retention prune for the global community channel: keep only the most
 * recent `RETENTION_LIMIT` messages, delete everything older. Soft-deleted rows
 * count toward the limit, so this is also how "message removed" placeholders
 * eventually disappear. Scheduled by convex/crons.ts.
 */
export const pruneOldMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Walk oldest-first; skip the rows we keep, delete the rest.
    const stale = await ctx.db
      .query("communityMessages")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    const toDelete = stale.slice(COMMUNITY_CHAT.RETENTION_LIMIT);
    for (const message of toDelete) {
      await ctx.db.delete(message._id);
    }
    return { deleted: toDelete.length };
  },
});
