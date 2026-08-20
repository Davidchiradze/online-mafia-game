import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "../../_generated/server";
import { getAuthenticatedUser, requireFeature } from "../../lib/auth";
import { FEATURES } from "../../lib/entitlements";
import { PERMISSIONS, roleHasPermission } from "../../lib/access";
import {
  getGameById,
  getPlayerInGame,
  verifyGamePin,
  PIN_VERDICT_CODE,
} from "../../lib/games";
import { SPECTATOR } from "../../lib/constants";

export const listByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("gameSpectators")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
  },
});

export const isSpectator = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const spectator = await ctx.db
      .query("gameSpectators")
      .withIndex("by_gameId_userId", (q) =>
        q.eq("gameId", gameId).eq("userId", userId),
      )
      .unique();

    return { isSpectator: !!spectator, spectator };
  },
});

/**
 * Take a seat in the audience. A private game needs its PIN — the same one
 * players use — unless the caller is staff.
 *
 * RETURNS the PIN failure instead of throwing it: a throw would roll back the
 * failed-attempt row `verifyGamePin` just wrote and defeat the throttle. Every
 * other rejection here is a plain precondition and still throws.
 */
export const join = mutation({
  args: { gameId: v.id("games"), pin: v.optional(v.string()) },
  handler: async (ctx, { gameId, pin }) => {
    const profile = await requireFeature(ctx, FEATURES.SPECTATE_GAME);
    const userId = profile._id;
    const game = await getGameById(ctx.db, gameId);

    if (game.gameStatus !== "playing") {
      throw new ConvexError({
        code: "SPECTATE_NOT_IN_PROGRESS",
        message: "Can only spectate games that are in progress",
      });
    }

    // Staff (moderators/admins) bypass the PIN and the capacity limit.
    const isPrivilegedSpectator = roleHasPermission(
      profile.role,
      PERMISSIONS.GAME_SPECTATE_ANY,
    );

    const existingPlayer = await getPlayerInGame(ctx.db, gameId, userId);
    if (existingPlayer) {
      throw new ConvexError({
        code: "ALREADY_PLAYER",
        message: "You are already a player in this game",
      });
    }

    const existing = await ctx.db
      .query("gameSpectators")
      .withIndex("by_gameId_userId", (q) =>
        q.eq("gameId", gameId).eq("userId", userId),
      )
      .unique();

    // Only a NEWCOMER is asked for the PIN. `join` doubles as the reconnect
    // path (the row below is deleted and re-inserted), so gating on it would
    // re-prompt a spectator who is only reloading the page.
    if (game.isPrivate && !isPrivilegedSpectator && !existing) {
      const verdict = await verifyGamePin(ctx.db, game, userId, pin);
      if (verdict !== "ok") {
        return { ok: false as const, code: PIN_VERDICT_CODE[verdict] };
      }
    }

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const spectators = await ctx.db
      .query("gameSpectators")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();

    if (
      !isPrivilegedSpectator &&
      spectators.length >= SPECTATOR.MAX_SPECTATORS_PER_GAME
    ) {
      throw new ConvexError({
        code: "SPECTATOR_LIMIT",
        message: "Maximum spectator limit reached",
      });
    }

    const nickname = profile.nickname ?? "Spectator";

    const spectatorId = await ctx.db.insert("gameSpectators", {
      gameId,
      userId,
      nickname,
    });

    return { ok: true as const, spectatorId };
  },
});

export const leave = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await leaveByUserId(ctx.db, gameId, userId);
  },
});

export const leaveAdmin = mutation({
  args: {
    gameId: v.id("games"),
    userId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, userId }) => {
    await leaveByUserId(ctx.db, gameId, userId);
  },
});

export const leaveAdminInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    userId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, userId }) => {
    await leaveByUserId(ctx.db, gameId, userId);
  },
});

async function leaveByUserId(
  db: import("../../_generated/server").DatabaseWriter,
  gameId: import("../../_generated/dataModel").Id<"games">,
  userId: import("../../_generated/dataModel").Id<"profiles">,
) {
  const spectator = await db
    .query("gameSpectators")
    .withIndex("by_gameId_userId", (q) =>
      q.eq("gameId", gameId).eq("userId", userId),
    )
    .unique();

  if (spectator) {
    await db.delete(spectator._id);
  }
}
