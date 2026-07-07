import { query, mutation } from "../_generated/server";
import { requireFeature } from "../lib/auth";
import { FEATURES } from "../lib/entitlements";

/**
 * Cap the reported unread count so the UI can render a "99+" style badge
 * without us ever needing to scan past it.
 */
const UNREAD_CAP = 99;

/**
 * Live unread count for the floating chat widget badge. Counts non-deleted
 * community messages newer than the caller's last mark-read, excluding the
 * caller's own messages (your own posts never show as unread to you).
 *
 * Returns 0 when the user has no read-state row yet — a brand-new user
 * shouldn't be greeted with a backlog of "unread" history. The widget
 * establishes a baseline by calling `markRead` on first mount.
 *
 * Reactive + bounded by retention (≤ RETENTION_LIMIT rows), so this is cheap.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireFeature(ctx, FEATURES.COMMUNITY_CHAT);

    const readState = await ctx.db
      .query("communityReadState")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .unique();

    if (!readState) return 0;

    const since = readState.lastReadAt;
    const newer = await ctx.db
      .query("communityMessages")
      .withIndex("by_createdAt", (q) => q.gt("createdAt", since))
      .order("desc")
      .take(UNREAD_CAP + 1);

    const count = newer.filter(
      (m) => m.deletedAt === undefined && m.authorId !== profile._id,
    ).length;

    return Math.min(count, UNREAD_CAP);
  },
});

/**
 * Mark the channel read up to "now" for the caller. Upserts the single
 * read-state row. Server-stamped time (never the client clock — see
 * docs/server-time.md). Called when the widget opens, while it's open and new
 * messages arrive, and once on first mount to establish a baseline.
 */
export const markRead = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await requireFeature(ctx, FEATURES.COMMUNITY_CHAT);
    const now = Date.now();

    const existing = await ctx.db
      .query("communityReadState")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: now });
    } else {
      await ctx.db.insert("communityReadState", {
        profileId: profile._id,
        lastReadAt: now,
      });
    }
  },
});
