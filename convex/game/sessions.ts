import { ConvexError, v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";
import { getAuthenticatedUser } from "../lib/auth";
import {
  getGameById,
  assertIsHost,
  getPlayersByGameId,
  archiveGameLog,
} from "../lib/games";
import {
  GAME_PHASES,
  JAPANESE_MAFIA_ROLE_DISTRIBUTION,
  GAME_CLEANUP,
} from "../lib/constants";

const removeGameInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games"> },
  null
>("lobby/games:removeInternal");

export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
  },
});

export const create = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const existing = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("gameSessions", {
      gameId,
      gamePhase: GAME_PHASES[0],
      isFinished: false,
      currentNightNumber: 0,
      nominatedPlayers: [],
      speakingOrder: [],
    });
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    updates: v.object({
      gamePhase: v.optional(v.string()),
      isFinished: v.optional(v.boolean()),
      currentNightNumber: v.optional(v.number()),
      currentSpeakerIndex: v.optional(v.union(v.number(), v.null())),
      dayRoundOpenerIndex: v.optional(v.union(v.number(), v.null())),
      foulEliminationOccurred: v.optional(v.boolean()),
      nominatedPlayers: v.optional(v.array(v.number())),
      speakerStartedAt: v.optional(v.union(v.string(), v.null())),
      speakingOrder: v.optional(v.array(v.number())),
    }),
  },
  handler: async (ctx, { sessionId, updates }) => {
    const userId = await getAuthenticatedUser(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session) throw new ConvexError({ code: "SESSION_NOT_FOUND", message: "Game session not found" });

    await assertIsHost(ctx.db, session.gameId, userId);

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (value === null) {
          patch[key] = undefined;
        } else {
          patch[key] = value;
        }
      }
    }

    await ctx.db.patch(sessionId, patch);
  },
});

/**
 * Start a game: shuffle seats, set status to 'playing', create session.
 * Roles are assigned separately via assignRandomRoles during picking_roles phase.
 */
export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    const players = await getPlayersByGameId(ctx.db, gameId);
    if (players.length === 0) throw new ConvexError({ code: "NO_PLAYERS_JOINED", message: "No players joined" });

    const maxSeats = game.maxPlayers;

    const seatedPlayers = players.filter(
      (p) =>
        p.seatNumber !== undefined &&
        p.seatNumber >= 1 &&
        p.seatNumber <= maxSeats,
    );

    const seatNumbers = seatedPlayers.map((p) => p.seatNumber as number);

    // Fisher-Yates shuffle
    for (let i = seatNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seatNumbers[i], seatNumbers[j]] = [seatNumbers[j], seatNumbers[i]];
    }

    for (let i = 0; i < seatedPlayers.length; i++) {
      await ctx.db.patch(seatedPlayers[i]._id, { seatNumber: seatNumbers[i] });
    }

    await ctx.db.patch(gameId, { gameStatus: "playing" });

    const startedAt = Date.now();

    const existing = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (existing) {
      if (existing.startedAt === undefined) {
        await ctx.db.patch(existing._id, { startedAt });
      }
      return existing._id;
    }

    return await ctx.db.insert("gameSessions", {
      gameId,
      gamePhase: GAME_PHASES[0],
      isFinished: false,
      currentNightNumber: 0,
      nominatedPlayers: [],
      speakingOrder: [],
      startedAt,
    });
  },
});

/**
 * Assign random roles to all non-host players.
 * Called when transitioning to the picking_roles phase.
 */
export const assignRandomRoles = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    const players = await getPlayersByGameId(ctx.db, gameId);
    const hostSeat = game.maxPlayers + 1;

    const playersWithSeats = players.filter(
      (p) => p.seatNumber !== undefined && p.seatNumber !== hostSeat,
    );

    const roles = [...JAPANESE_MAFIA_ROLE_DISTRIBUTION];
    // Fisher-Yates shuffle
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    for (let i = 0; i < playersWithSeats.length && i < roles.length; i++) {
      const existing = await ctx.db
        .query("gamePlayerRoles")
        .withIndex("by_gameId_playerId", (q) =>
          q.eq("gameId", gameId).eq("playerId", playersWithSeats[i].playerId),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { role: roles[i] });
      } else {
        await ctx.db.insert("gamePlayerRoles", {
          gameId,
          playerId: playersWithSeats[i].playerId,
          role: roles[i],
        });
      }
    }
  },
});

export const finishGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    if (game.gameStatus !== "playing") {
      throw new ConvexError({ code: "GAME_NOT_PLAYING", message: "Game is not currently playing" });
    }

    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (!session) throw new ConvexError({ code: "SESSION_NOT_FOUND", message: "Game session not found" });
    if (session.isFinished) throw new ConvexError({ code: "GAME_ALREADY_FINISHED", message: "Game is already finished" });

    // Persist the permanent game-log snapshot BEFORE flipping status / scheduling
    // cleanup — the cleanup cascade-deletes the live game and all its relations.
    await archiveGameLog(ctx, gameId);

    await ctx.db.patch(gameId, { gameStatus: "finished" });
    await ctx.db.patch(session._id, { isFinished: true });

    await ctx.scheduler.runAfter(GAME_CLEANUP.DELAY_MS, removeGameInternal, {
      gameId,
    });
  },
});
