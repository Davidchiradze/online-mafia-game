import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Per-user read state for the global community chat. Tracks the last time a
 * user "read" the channel so the floating chat widget can show a live unread
 * count (server-side, industry-standard `last_read` model — syncs across
 * devices and survives a cache clear, unlike a client-only marker).
 *
 * Kept in its own table rather than as a `profiles` field on purpose: writing
 * read state on every mark-read would invalidate the heavily-subscribed
 * `currentProfile` query everywhere. One row per profile.
 */
export const communityReadState = defineTable({
  profileId: v.id("profiles"),
  lastReadAt: v.number(), // ms epoch of the most recent mark-read
}).index("by_profile", ["profileId"]);
