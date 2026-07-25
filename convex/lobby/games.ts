import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { getAuthenticatedUser, requireFeature } from "../lib/auth";
import { FEATURES } from "../lib/entitlements";
import {
  getGameById,
  getPlayersByGameId,
  getSpectatorsByGameId,
  generateGameCode,
  isCodeTaken,
  assertIsHost,
  deleteGameAndRelations,
} from "../lib/games";
import { getLiveTableAvgRating } from "../lib/playerRatings";
import { gameType } from "../tables/games";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Enriches a game's players and spectators with each user's current `avatar`
 * (read live from their profile). Nicknames are snapshotted on the roster
 * rows, but avatars are joined here so they stay in sync with profile changes.
 */
async function withRosterAvatars(
  ctx: QueryCtx,
  game: Doc<"games">,
  players: Doc<"gamePlayers">[],
  spectators: Doc<"gameSpectators">[],
) {
  const playersWithAvatar = await Promise.all(
    players.map(async (player) => {
      const profile = await ctx.db.get(player.playerId);
      return { ...player, avatar: profile?.avatar };
    }),
  );
  const spectatorsWithAvatar = await Promise.all(
    spectators.map(async (spectator) => {
      const profile = await ctx.db.get(spectator.userId);
      return { ...spectator, avatar: profile?.avatar };
    }),
  );
  return {
    ...game,
    players: playersWithAvatar,
    spectators: spectatorsWithAvatar,
  };
}

const GAME_TYPE_MAX_PLAYERS: Record<string, number> = {
  sports_mafia: 10,
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
        const enriched = await withRosterAvatars(ctx, game, players, spectators);
        return {
          ...enriched,
          tableAvgRating: await getLiveTableAvgRating(ctx.db, game, players),
        };
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
    const enriched = await withRosterAvatars(ctx, game, players, spectators);
    return {
      ...enriched,
      tableAvgRating: await getLiveTableAvgRating(ctx.db, game, players),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    gameType,
    isPrivate: v.boolean(),
  },
  handler: async (ctx, { name, gameType, isPrivate }) => {
    const { _id: userId } = await requireFeature(ctx, FEATURES.PLAY_GAME);

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new ConvexError({ code: "GAME_NAME_REQUIRED", message: "Game name is required" });
    }

    const maxPlayers = GAME_TYPE_MAX_PLAYERS[gameType];
    if (!maxPlayers) {
      throw new ConvexError({ code: "INVALID_GAME_TYPE", message: "Invalid game type" });
    }

    let code = generateGameCode();
    let attempts = 0;
    while (await isCodeTaken(ctx.db, code)) {
      if (++attempts >= MAX_CODE_ATTEMPTS) {
        throw new ConvexError({ code: "GAME_CODE_GEN_FAILED", message: "Unable to generate a unique game code. Try again." });
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
      isPrivate,
    });

    return gameId;
  },
});

export const remove = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    await deleteGameAndRelations(ctx.db, gameId);
  },
});

export const update = mutation({
  args: {
    gameId: v.id("games"),
    name: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { gameId, name, isPrivate }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const patch: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length === 0) throw new ConvexError({ code: "ROOM_NAME_EMPTY", message: "Room name cannot be empty" });
      patch.name = trimmed;
    }

    if (isPrivate !== undefined) {
      patch.isPrivate = isPrivate;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(gameId, patch);
    }
  },
});

export const removeInternal = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) return;
    await deleteGameAndRelations(ctx.db, gameId);
  },
});

