import { v } from "convex/values";
import { query, mutation, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthenticatedUser } from "../lib/auth";
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
    const userId = await getAuthenticatedUser(ctx);
    const game = await getGameById(ctx.db, gameId);

    if (game.hostId === userId) {
      return { allowed: true, status: "accepted" as const };
    }

    const existingPlayer = await getPlayerInGame(ctx.db, gameId, userId);
    if (existingPlayer) {
      return { allowed: true, status: "accepted" as const };
    }

    if (game.gameStatus !== "not_started") {
      return { allowed: false, status: "none" as const };
    }

    const existing = await getJoinRequestByRequester(ctx.db, gameId, userId);
    if (existing) {
      return {
        allowed: existing.status === "accepted",
        status: existing.status,
      };
    }

    const profile = await ctx.db.get(userId);
    const nickname = profile?.nickname ?? "Player";

    const requestId = await ctx.db.insert("joinRequests", {
      gameId,
      requesterId: userId,
      requesterNickname: nickname,
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
    const userId = await getAuthenticatedUser(ctx);
    await getGameById(ctx.db, gameId);

    const existing = await getJoinRequestByRequester(ctx.db, gameId, userId);
    if (existing && (existing.status === "pending" || existing.status === "accepted")) {
      return { requestId: existing._id, status: existing.status };
    }

    const profile = await ctx.db.get(userId);
    const nickname = profile?.nickname ?? "Player";

    if (existing && existing.status === "rejected") {
      throw new Error("Your join request was rejected");
    }

    const requestId = await ctx.db.insert("joinRequests", {
      gameId,
      requesterId: userId,
      requesterNickname: nickname,
      status: "pending",
    });

    return { requestId, status: "pending" as const };
  },
});

/**
 * Reactive query: returns the current user's access status for a game.
 * Used by the game page to reactively watch for host accept/reject.
 */
export const myStatus = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await ctx.db.get(gameId);

    if (!game) {
      return { allowed: false, status: "none" as const };
    }

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

    return { allowed: false, status: "none" as const };
  },
});

/**
 * Reactive count of pending join requests for a game.
 * Lightweight query the host subscribes to for the badge indicator.
 */
export const countPending = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const pending = await ctx.db
      .query("joinRequests")
      .withIndex("by_gameId_status", (q) =>
        q.eq("gameId", gameId).eq("status", "pending"),
      )
      .collect();
    return pending.length;
  },
});

/**
 * Attaches the requester's current avatar (from their profile) to each join
 * request. The nickname is snapshotted on the request itself, but the avatar
 * is read live so it stays in sync with profile changes.
 */
async function withRequesterAvatar<T extends { requesterId: Id<"profiles"> }>(
  ctx: QueryCtx,
  requests: T[],
) {
  return await Promise.all(
    requests.map(async (request) => {
      const profile = await ctx.db.get(request.requesterId);
      return { ...request, requesterAvatar: profile?.avatar };
    }),
  );
}

/**
 * List pending join requests for a game. Reactive — auto-updates in real time.
 * Used by the host notification system to track individual new requests.
 */
export const listPending = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_gameId_status", (q) =>
        q.eq("gameId", gameId).eq("status", "pending"),
      )
      .collect();
    return await withRequesterAvatar(ctx, requests);
  },
});

/**
 * List all join requests for a game. Reactive — auto-updates in real time.
 */
export const listByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    return await withRequesterAvatar(ctx, requests);
  },
});

/**
 * Host accepts a join request.
 */
export const accept = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const joinRequest = await ctx.db.get(requestId);
    if (!joinRequest) {
      throw new Error("Join request not found");
    }

    await assertIsHost(ctx.db, joinRequest.gameId, userId);

    await ctx.db.patch(requestId, { status: "accepted" });
  },
});

/**
 * Host rejects a join request.
 */
export const reject = mutation({
  args: { requestId: v.id("joinRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthenticatedUser(ctx);
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
    targetUserId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, targetUserId }) => {
    const userId = await getAuthenticatedUser(ctx);
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
