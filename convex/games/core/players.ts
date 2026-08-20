import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "../../_generated/server";
import { getAuthenticatedUser, requireFeature } from "../../lib/auth";
import { FEATURES } from "../../lib/entitlements";
import {
  getGameById,
  assertIsHost,
  getPlayerInGame,
  getJoinRequestByRequester,
} from "../../lib/games";

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

    // Enrich each player with their profile avatar so the client can render a
    // profile picture in the tile when their camera is off.
    const withAvatar = await Promise.all(
      players.map(async (player) => {
        const profile = await ctx.db.get(player.playerId);
        return { ...player, avatar: profile?.avatar };
      }),
    );

    return withAvatar.sort(
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
    const { _id: userId } = await requireFeature(ctx, FEATURES.PLAY_GAME);
    const game = await getGameById(ctx.db, gameId);

    const players = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();

    // Reconnect path: anyone already seated is let straight back in, mid-game
    // reloads included. Deliberately ahead of the PIN gate below — a player who
    // is already in the game must never be asked for the PIN again.
    const existing = players.find((p) => p.playerId === userId);
    if (existing) {
      await ctx.db.patch(existing._id, { state: "joined" });
      return { playerId: existing._id, game };
    }

    const isHost = game.hostId === userId;
    const maxSeats = game.maxPlayers;

    // A private room hands out seats only against the grant that
    // `lobby/joinRequests:submitPin` writes on a correct PIN. Without this the
    // PIN would be a UI formality: `join` is a public mutation anyone can call.
    if (game.isPrivate && !isHost) {
      const grant = await getJoinRequestByRequester(ctx.db, gameId, userId);
      if (grant?.status !== "accepted") {
        throw new ConvexError({
          code: "GAME_PIN_REQUIRED",
          message: "This room needs its PIN before you can take a seat",
        });
      }
    }

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
      if (seatNumber === undefined) throw new ConvexError("Room is full");
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

export const setReady = mutation({
  args: { gameId: v.id("games"), ready: v.boolean() },
  handler: async (ctx, { gameId, ready }) => {
    const userId = await getAuthenticatedUser(ctx);
    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player) throw new ConvexError("Player not found in game");
    await ctx.db.patch(player._id, { isReady: ready });
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
  ctx: { db: import("../../_generated/server").DatabaseWriter },
  gameId: import("../../_generated/dataModel").Id<"games">,
  userId: import("../../_generated/dataModel").Id<"profiles">,
) {
  const game = await getGameById(ctx.db, gameId);
  const player = await getPlayerInGame(ctx.db, gameId, userId);
  if (!player) throw new ConvexError("Player not found in game");

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
    if (!target) throw new ConvexError("Player not found in this game");
    if (!target.isAlive) throw new ConvexError("Player is already dead");

    await ctx.db.patch(target._id, { isAlive: false });
  },
});
