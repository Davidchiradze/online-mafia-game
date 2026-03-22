import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { getGameById, assertIsHost, getPlayerInGame } from "../lib/games";

function isGameStarted(status: string) {
  return status === "playing" || status === "finished";
}

export const listByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const players = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();

    return players.sort(
      (a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0),
    );
  },
});

export const isPlayer = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const player = await getPlayerInGame(ctx.db, gameId, userId);
    return { isPlayer: !!player, player };
  },
});

export const join = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await getGameById(ctx.db, gameId);

    const players = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();

    const existing = players.find((p) => p.playerId === userId);
    if (existing) {
      await ctx.db.patch(existing._id, { state: "joined" });
      return { playerId: existing._id, game };
    }

    const isHost = game.hostId === userId;
    const maxSeats = game.maxPlayers;

    const usedSeats = new Set<number>();
    for (const p of players) {
      if (p.seatNumber !== undefined && p.seatNumber >= 1) {
        usedSeats.add(p.seatNumber);
      }
    }

    let seatNumber: number | undefined;
    if (isHost) {
      seatNumber = maxSeats + 1;
    } else if (isGameStarted(game.gameStatus)) {
      seatNumber = undefined;
    } else {
      for (let i = 1; i <= maxSeats; i++) {
        if (!usedSeats.has(i)) {
          seatNumber = i;
          break;
        }
      }
      if (seatNumber === undefined) throw new Error("Room is full");
    }

    const profile = await ctx.db.get(userId);
    const nickname = profile?.nickname ?? "Player";

    const playerId = await ctx.db.insert("gamePlayers", {
      gameId,
      playerId: userId,
      nickname,
      seatNumber,
      isAlive: true,
      fouls: 0,
      state: "joined",
    });

    return { playerId, game };
  },
});

export const leave = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await leaveByUserId(ctx, gameId, userId);
  },
});

export const leaveAdmin = mutation({
  args: {
    gameId: v.id("games"),
    userId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, userId }) => {
    await leaveByUserId(ctx, gameId, userId);
  },
});

export const leaveAdminInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    userId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, userId }) => {
    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player) return;
    const game = await getGameById(ctx.db, gameId);
    if (!isGameStarted(game.gameStatus)) {
      await ctx.db.delete(player._id);
    } else {
      await ctx.db.patch(player._id, { state: "disconnected" });
    }
  },
});

async function leaveByUserId(
  ctx: { db: import("../_generated/server").DatabaseWriter },
  gameId: import("../_generated/dataModel").Id<"games">,
  userId: import("../_generated/dataModel").Id<"profiles">,
) {
  const game = await getGameById(ctx.db, gameId);
  const player = await getPlayerInGame(ctx.db, gameId, userId);
  if (!player) throw new Error("Player not found in game");

  if (!isGameStarted(game.gameStatus)) {
    await ctx.db.delete(player._id);
  } else {
    await ctx.db.patch(player._id, { state: "disconnected" });
  }
}

export const kill = mutation({
  args: {
    gameId: v.id("games"),
    targetPlayerId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, targetPlayerId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const target = await getPlayerInGame(ctx.db, gameId, targetPlayerId);
    if (!target) throw new Error("Player not found in this game");
    if (!target.isAlive) throw new Error("Player is already dead");

    await ctx.db.patch(target._id, { isAlive: false });
  },
});
