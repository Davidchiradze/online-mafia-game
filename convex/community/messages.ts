import { ConvexError, v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireFeature, requirePermission } from "../lib/auth";
import { FEATURES } from "../lib/entitlements";
import { PERMISSIONS } from "../lib/access";
import { normalizeRole } from "../lib/access";
import { COMMUNITY_CHAT, PRESENCE } from "../lib/constants";
import { presence } from "../presence";

/**
 * The most recent messages in the global community channel, oldest-first so the
 * client can append-and-scroll. Subscription-gated. Soft-deleted messages are
 * returned with their text stripped and `deleted: true` so the UI renders a
 * "message removed" placeholder in place rather than a gap.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireFeature(ctx, FEATURES.COMMUNITY_CHAT);

    const recent = await ctx.db
      .query("communityMessages")
      .withIndex("by_createdAt")
      .order("desc")
      .take(COMMUNITY_CHAT.LIST_LIMIT);

    // Re-order to ascending (oldest → newest) for rendering.
    return recent.reverse().map((m) => ({
      _id: m._id,
      authorId: m.authorId,
      authorNickname: m.authorNickname,
      authorAvatar: m.authorAvatar,
      authorRole: m.authorRole,
      createdAt: m.createdAt,
      deleted: m.deletedAt !== undefined,
      // Never ship deleted text to the client.
      text: m.deletedAt !== undefined ? "" : m.text,
    }));
  },
});

/**
 * Post a message to the global channel. Authoritative gate order:
 *   1. subscription (or staff) — `requireFeature`
 *   2. not banned
 *   3. non-empty, within length
 *   4. not faster than the per-author cooldown (anti-spam)
 * Author identity is denormalized onto the row at send-time.
 */
export const send = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const profile = await requireFeature(ctx, FEATURES.COMMUNITY_CHAT);

    if (profile.bannedAt !== undefined) {
      throw new ConvexError({
        code: "CHAT_BANNED",
        message: "Your account is banned from chat.",
      });
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new ConvexError({
        code: "CHAT_EMPTY",
        message: "Message cannot be empty.",
      });
    }
    if (trimmed.length > COMMUNITY_CHAT.MAX_MESSAGE_LENGTH) {
      throw new ConvexError({
        code: "CHAT_TOO_LONG",
        message: `Message must be ${COMMUNITY_CHAT.MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    const now = Date.now();
    const last = await ctx.db
      .query("communityMessages")
      .withIndex("by_author", (q) => q.eq("authorId", profile._id))
      .order("desc")
      .first();
    if (last && now - last.createdAt < COMMUNITY_CHAT.SEND_COOLDOWN_MS) {
      throw new ConvexError({
        code: "CHAT_RATE_LIMITED",
        message: "You're sending messages too quickly. Please slow down.",
      });
    }

    await ctx.db.insert("communityMessages", {
      authorId: profile._id,
      authorNickname: profile.nickname,
      authorAvatar: profile.avatar,
      authorRole: normalizeRole(profile.role),
      text: trimmed,
      createdAt: now,
    });
  },
});

/**
 * Soft-delete any message (admin/moderator). Keeps the row so `list` can render
 * a "message removed" placeholder; the daily prune eventually drops it.
 */
export const remove = mutation({
  args: { messageId: v.id("communityMessages") },
  handler: async (ctx, { messageId }) => {
    const moderator = await requirePermission(
      ctx,
      PERMISSIONS.CHAT_MESSAGE_DELETE,
    );

    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new ConvexError({
        code: "CHAT_MESSAGE_NOT_FOUND",
        message: "Message not found.",
      });
    }
    if (message.deletedAt !== undefined) return; // idempotent

    await ctx.db.patch(messageId, {
      deletedAt: Date.now(),
      deletedBy: moderator._id,
    });
  },
});

/**
 * Live list of users currently on the site, for the chat's online sidebar.
 * Mirrors the admin `presence.onlineNow` but gated on the chat subscription
 * feature instead of an admin permission. Kept separate from the shared
 * `presence.list` cache (which must stay free of per-user reads).
 */
export const onlineInCommunity = query({
  args: {},
  handler: async (ctx) => {
    await requireFeature(ctx, FEATURES.COMMUNITY_CHAT);

    const online = await presence.listRoom(
      ctx,
      PRESENCE.GLOBAL_ROOM,
      true, // onlineOnly
      COMMUNITY_CHAT.ONLINE_CAP,
    );

    const users = await Promise.all(
      online.map(async (entry) => {
        const profile = await ctx.db.get(entry.userId as Id<"profiles">);
        return {
          profileId: entry.userId,
          nickname: profile?.nickname ?? "Unknown",
          avatar: profile?.avatar,
          role: normalizeRole(profile?.role),
        };
      }),
    );

    // Stable, deterministic order (no Date/random in Convex): by nickname.
    users.sort((a, b) => a.nickname.localeCompare(b.nickname));

    return { count: users.length, users };
  },
});
