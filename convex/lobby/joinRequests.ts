import { ConvexError, v } from "convex/values";
import { query, mutation, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthenticatedUser, requireFeature } from "../lib/auth";
import { FEATURES } from "../lib/entitlements";
import {
  getGameById,
  assertIsHost,
  getJoinRequestByRequester,
  getPlayerInGame,
  getPlayersByGameId,
  verifyGamePin,
  PIN_VERDICT_CODE,
} from "../lib/games";

/**
 * Determines the caller's access status for a game.
 *
 * Priority: host → existing player → private (locked) → accepted → pending →
 * rejected → create pending.
 */
export const checkOrRequest = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { _id: userId } = await requireFeature(ctx, FEATURES.PLAY_GAME);
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

    // A private room is gated by its PIN, not by the host: no request row is
    // created, so the host is never asked to approve anyone and no waiting
    // room is ever shown. `submitPin` writes the grant once the PIN is right.
    if (game.isPrivate) {
      return { allowed: false, status: "locked" as const };
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
 * Unlock a private room with its PIN. The PIN replaces host approval entirely:
 * a correct one writes an already-`accepted` join request, which is the same
 * grant the host would have created, so the rest of the join flow (`myStatus`
 * → `gamePlayers:join` → LiveKit) is untouched.
 *
 * RETURNS the failure instead of throwing it, because a throw would roll back
 * the failed-attempt row `verifyGamePin` just wrote and defeat the throttle.
 * Genuine precondition failures (not authenticated, no such game) still throw.
 */
export const submitPin = mutation({
  args: { gameId: v.id("games"), pin: v.string() },
  handler: async (ctx, { gameId, pin }) => {
    const { _id: userId } = await requireFeature(ctx, FEATURES.PLAY_GAME);
    const game = await getGameById(ctx.db, gameId);

    // Already in — the host, a seated player reconnecting, or someone who
    // unlocked earlier. Never ask any of them for the PIN again.
    if (game.hostId === userId) return { ok: true as const };
    if (await getPlayerInGame(ctx.db, gameId, userId)) {
      return { ok: true as const };
    }
    const existing = await getJoinRequestByRequester(ctx.db, gameId, userId);
    if (existing?.status === "accepted") return { ok: true as const };

    if (game.gameStatus !== "not_started") {
      return { ok: false as const, code: "GAME_NOT_PLAYING" };
    }

    const verdict = await verifyGamePin(ctx.db, game, userId, pin);
    if (verdict !== "ok") {
      return { ok: false as const, code: PIN_VERDICT_CODE[verdict] };
    }

    // Check capacity before granting, so a full room says so plainly instead
    // of letting `gamePlayers:join` fail later with nowhere to show it.
    const players = await getPlayersByGameId(ctx.db, gameId);
    const takenSeats = players.filter(
      (p) => p.seatNumber !== undefined && p.seatNumber >= 1,
    ).length;
    if (takenSeats >= game.maxPlayers) {
      return { ok: false as const, code: "ROOM_FULL" };
    }

    // A pending/rejected row can survive a room being switched from public to
    // private. Promote it rather than inserting a second one —
    // `getJoinRequestByRequester` is a `.unique()` read and would then throw.
    if (existing) {
      await ctx.db.patch(existing._id, { status: "accepted" });
      return { ok: true as const };
    }

    const profile = await ctx.db.get(userId);
    await ctx.db.insert("joinRequests", {
      gameId,
      requesterId: userId,
      requesterNickname: profile?.nickname ?? "Player",
      status: "accepted",
    });

    return { ok: true as const };
  },
});

/**
 * Explicitly request to join a game.
 * Returns existing request if one already exists (pending/accepted).
 */
export const request = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { _id: userId } = await requireFeature(ctx, FEATURES.PLAY_GAME);
    await getGameById(ctx.db, gameId);

    const existing = await getJoinRequestByRequester(ctx.db, gameId, userId);
    if (
      existing &&
      (existing.status === "pending" || existing.status === "accepted")
    ) {
      return { requestId: existing._id, status: existing.status };
    }

    const profile = await ctx.db.get(userId);
    const nickname = profile?.nickname ?? "Player";

    if (existing && existing.status === "rejected") {
      throw new ConvexError("Your join request was rejected");
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
 * Reactive list of the caller's own join requests that are still worth
 * notifying on. Used by the lobby-level listener to surface accept/reject
 * toasts after the player has left the in-game waiting room.
 *
 * Returns pending requests plus any whose game is still `not_started`, each
 * with its game's display name. Requests for deleted games are skipped.
 */
export const myActiveRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUser(ctx);

    const requests = await ctx.db
      .query("joinRequests")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", userId))
      .collect();

    const results = await Promise.all(
      requests.map(async (request) => {
        const game = await ctx.db.get(request.gameId);
        if (!game) return null;
        if (request.status !== "pending" && game.gameStatus !== "not_started") {
          return null;
        }
        return {
          requestId: request._id,
          gameId: request.gameId,
          gameName: game.name,
          status: request.status,
        };
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
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
      throw new ConvexError("Join request not found");
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
      throw new ConvexError("Join request not found");
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
      throw new ConvexError("Cannot kick yourself");
    }

    const joinRequest = await getJoinRequestByRequester(
      ctx.db,
      gameId,
      targetUserId,
    );
    if (joinRequest && joinRequest.status !== "rejected") {
      await ctx.db.patch(joinRequest._id, { status: "rejected" });
    }

    const player = await getPlayerInGame(ctx.db, gameId, targetUserId);
    if (player) {
      await ctx.db.delete(player._id);
    }
  },
});
