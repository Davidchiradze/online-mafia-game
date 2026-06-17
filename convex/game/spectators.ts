import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { getGameById, getPlayerInGame } from "../lib/games";
import { SPECTATOR } from "../lib/constants";

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

export const join = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await getGameById(ctx.db, gameId);

    if (game.gameStatus !== "playing") {
      throw new ConvexError({ code: "SPECTATE_NOT_IN_PROGRESS", message: "Can only spectate games that are in progress" });
    }

    const isPrivilegedSpectator =
      SPECTATOR.PRIVILEGED_PROFILE_IDS.includes(userId);

    if (game.isPrivate && !isPrivilegedSpectator) {
      throw new ConvexError({ code: "SPECTATE_PRIVATE", message: "This game is private. Spectators cannot join." });
    }

    const existingPlayer = await getPlayerInGame(ctx.db, gameId, userId);
    if (existingPlayer) {
      throw new ConvexError({ code: "ALREADY_PLAYER", message: "You are already a player in this game" });
    }

    const existing = await ctx.db
      .query("gameSpectators")
      .withIndex("by_gameId_userId", (q) =>
        q.eq("gameId", gameId).eq("userId", userId),
      )
      .unique();

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
      throw new ConvexError({ code: "SPECTATOR_LIMIT", message: "Maximum spectator limit reached" });
    }

    const profile = await ctx.db.get(userId);
    const nickname = profile?.nickname ?? "Spectator";

    const id = await ctx.db.insert("gameSpectators", {
      gameId,
      userId,
      nickname,
    });

    return id;
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
  db: import("../_generated/server").DatabaseWriter,
  gameId: import("../_generated/dataModel").Id<"games">,
  userId: import("../_generated/dataModel").Id<"profiles">,
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
