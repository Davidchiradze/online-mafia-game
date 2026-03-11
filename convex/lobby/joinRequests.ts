import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthenticatedUserId } from "../lib/auth";
import { getProfileByUserId } from "../lib/profiles";
import {
  getGameById,
  assertIsHost,
  getJoinRequestByRequester,
  getPlayerInGame,
} from "../lib/games";

/**
 * Determines the caller's access status for a game.
 *
 * Priority: host → existing player → accepted → pending → rejected → create pending.
 */
export const checkOrRequest = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const game = await getGameById(ctx.db, gameId);

    if (game.hostId === userId) {
      return { allowed: true, status: "accepted" as const };
    }

    const existingPlayer = await getPlayerInGame(ctx.db, gameId, userId);
    if (existingPlayer) {
      return { allowed: true, status: "accepted" as const };
    }

    const existing = await getJoinRequestByRequester(ctx.db, gameId, userId);
    if (existing) {
      return {
        allowed: existing.status === "accepted",
        status: existing.status,
      };
    }

    const profile = await getProfileByUserId(ctx.db, userId);
    if (!profile) {
      throw new Error("Profile not found. Please set up your profile first.");
    }

    const requestId = await ctx.db.insert("joinRequests", {
      gameId,
      requesterId: userId,
      requesterNickname: profile.nickname,
      status: "pending",
    });

    return {
      allowed: false,
      status: "pending" as const,
      requestId,
    };
  },
});

/**
 * Explicitly request to join a game.
 * Returns existing request if one already exists (pending/accepted).
 */
export const request = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await getGameById(ctx.db, gameId);

    const existing = await getJoinRequestByRequester(ctx.db, gameId, userId);
    if (existing && (existing.status === "pending" || existing.status === "accepted")) {
      return { requestId: existing._id, status: existing.status };
    }

    const profile = await getProfileByUserId(ctx.db, userId);
    if (!profile) {
      throw new Error("Profile not found. Please set up your profile first.");
    }

    if (existing && existing.status === "rejected") {
      throw new Error("Your join request was rejected");
    }

    const requestId = await ctx.db.insert("joinRequests", {
      gameId,
      requesterId: userId,
      requesterNickname: profile.nickname,
      status: "pending",
    });

    return { requestId, status: "pending" as const };
  },
});

/**
 * List all join requests for a game. Reactive — auto-updates in real time.
 */
export const listByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("joinRequests")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
  },
});

/**
 * Host accepts a join request.
 */
export const accept = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const joinRequest = await ctx.db.get(requestId);
    if (!joinRequest) {
      throw new Error("Join request not found");
    }

    await assertIsHost(ctx.db, joinRequest.gameId, userId);

    if (joinRequest.status !== "pending") {
      throw new Error(`Cannot accept a request with status "${joinRequest.status}"`);
    }

    await ctx.db.patch(requestId, { status: "accepted" });
  },
});

/**
 * Host rejects a join request.
 */
export const reject = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    const joinRequest = await ctx.db.get(requestId);
    if (!joinRequest) {
      throw new Error("Join request not found");
    }

    await assertIsHost(ctx.db, joinRequest.gameId, userId);

    if (joinRequest.status === "rejected") {
      return;
    }

    await ctx.db.patch(requestId, { status: "rejected" });
  },
});

/**
 * Host kicks a player by rejecting their join request and removing them from gamePlayers.
 */
export const kick = mutation({
  args: {
    gameId: v.id("games"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { gameId, targetUserId }) => {
    const userId = await getAuthenticatedUserId(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    if (targetUserId === userId) {
      throw new Error("Cannot kick yourself");
    }

    const joinRequest = await getJoinRequestByRequester(ctx.db, gameId, targetUserId);
    if (joinRequest && joinRequest.status !== "rejected") {
      await ctx.db.patch(joinRequest._id, { status: "rejected" });
    }

    const player = await getPlayerInGame(ctx.db, gameId, targetUserId);
    if (player) {
      await ctx.db.delete(player._id);
    }
  },
});
