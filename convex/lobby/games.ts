import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import {
  getGameById,
  getPlayersByGameId,
  getSpectatorsByGameId,
  generateGameCode,
  isCodeTaken,
  assertIsHost,
} from "../lib/games";
import { gameType } from "../tables/games";

const GAME_TYPE_MAX_PLAYERS: Record<string, number> = {
  traditional: 10,
  city_mafia: 12,
  japanese_mafia: 12,
};

const MAX_CODE_ATTEMPTS = 5;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .order("desc")
      .collect();

    return await Promise.all(
      games.map(async (game) => {
        const players = await getPlayersByGameId(ctx.db, game._id);
        const spectators = await getSpectatorsByGameId(ctx.db, game._id);
        return { ...game, players, spectators };
      }),
    );
  },
});

export const getById = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) return null;
    const players = await getPlayersByGameId(ctx.db, game._id);
    const spectators = await getSpectatorsByGameId(ctx.db, game._id);
    return { ...game, players, spectators };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    gameType,
  },
  handler: async (ctx, { name, gameType }) => {
    const userId = await getAuthenticatedUser(ctx);

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Game name is required");
    }

    const maxPlayers = GAME_TYPE_MAX_PLAYERS[gameType];
    if (!maxPlayers) {
      throw new Error("Invalid game type");
    }

    let code = generateGameCode();
    let attempts = 0;
    while (await isCodeTaken(ctx.db, code)) {
      if (++attempts >= MAX_CODE_ATTEMPTS) {
        throw new Error("Unable to generate a unique game code. Try again.");
      }
      code = generateGameCode();
    }

    const gameId = await ctx.db.insert("games", {
      code,
      name: trimmedName,
      hostId: userId,
      gameType,
      gameStatus: "not_started",
      maxPlayers,
    });

    return gameId;
  },
});

export const remove = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const players = await getPlayersByGameId(ctx.db, gameId);
    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    const spectators = await getSpectatorsByGameId(ctx.db, gameId);
    for (const spectator of spectators) {
      await ctx.db.delete(spectator._id);
    }

    const joinRequests = await ctx.db
      .query("joinRequests")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    for (const request of joinRequests) {
      await ctx.db.delete(request._id);
    }

    await ctx.db.delete(gameId);
  },
});
