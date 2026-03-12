import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
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
      throw new Error("Can only spectate games that are in progress");
    }

    const existingPlayer = await getPlayerInGame(ctx.db, gameId, userId);
    if (existingPlayer) {
      throw new Error("You are already a player in this game");
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

    if (spectators.length >= SPECTATOR.MAX_SPECTATORS_PER_GAME) {
      throw new Error("Maximum spectator limit reached");
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
