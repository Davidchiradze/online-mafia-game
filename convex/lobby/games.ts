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
import { getGameDefinition } from "../games/registry";
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

const MAX_CODE_ATTEMPTS = 5;

/**
 * Table size for a game type, or `null` when the type has no rules.
 *
 * `definition.seatCount` is the single source — a variant declares how many
 * players it seats once, next to the deck that has to match it. The old local
 * `Record<string, number>` was a second copy whose keys `tsc` never checked
 * against the registry.
 *
 * `null` is reachable: `city_mafia` sits in the `gameType` validator union with
 * no definition registered, so this doubles as the SERVER-side gate on creating
 * an unbuilt variant. `CreateGameModal` only hides it from the dropdown.
 */
function seatCountFor(gameType: string): number | null {
  try {
    return getGameDefinition(gameType).seatCount;
  } catch {
    return null;
  }
}

/**
 * Anonymous-readable (see `GUEST_VIEWABLE_PATHS` in `convex/lib/access.ts`) —
 * this is the guest lobby's data source. Project an explicit field list,
 * never a spread of `game`: a future column added to the table must be a
 * deliberate decision to publish, not an accident of `...game`. `code` is
 * excluded on purpose (see `LobbyGameSummary` in `convex/refs/lobby.ts`).
 */
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
        const tableAvgRating = await getLiveTableAvgRating(ctx.db, game, players);
        return {
          _id: enriched._id,
          _creationTime: enriched._creationTime,
          name: enriched.name,
          hostId: enriched.hostId,
          gameType: enriched.gameType,
          gameStatus: enriched.gameStatus,
          maxPlayers: enriched.maxPlayers,
          isPrivate: enriched.isPrivate,
          players: enriched.players,
          spectators: enriched.spectators,
          tableAvgRating,
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

    const maxPlayers = seatCountFor(gameType);
    if (maxPlayers === null) {
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

