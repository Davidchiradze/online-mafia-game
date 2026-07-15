import { ConvexError, v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { assertIsHost, getPlayersByGameId } from "../lib/games";
import { enterNightPhase, enterDayPhase } from "../lib/phaseTransitions";
import { getGameDefinition } from "../games/registry";
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getGameSession(db: DatabaseReader, gameId: Id<"games">) {
  const session = await db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session) throw new ConvexError("Game session not found");
  return session;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Reactive farewell speech state for UI display.
 */
export const getState = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (!session) return null;

    const speakingOrder = session.speakingOrder ?? [];
    const players = await getPlayersByGameId(ctx.db, gameId);

    const aliveMap = new Map<number, boolean>();
    for (const p of players) {
      if (p.seatNumber !== undefined) {
        aliveMap.set(p.seatNumber, p.isAlive);
      }
    }

    const completedSpeakers = speakingOrder.filter(
      (seat) => aliveMap.get(seat) === false,
    );
    const remainingSpeakers = speakingOrder.filter(
      (seat) => aliveMap.get(seat) === true,
    );

    return {
      speakingOrder,
      currentSpeaker: session.currentSpeakerIndex ?? null,
      speakerStartedAt: session.speakerStartedAt ?? null,
      completedSpeakers,
      remainingSpeakers,
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Start the farewell speech phase after night kills.
 * Determines killed players (not healed), randomizes order.
 * If no one dies, skips directly to day_phase.
 */
export const startFarewellSpeech = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const nightNumber = session.currentNightNumber;
    const nightSession = await ctx.db
      .query("nightPhaseSessions")
      .withIndex("by_gameId_nightNumber", (q) =>
        q.eq("gameId", gameId).eq("nightNumber", nightNumber),
      )
      .unique();

    if (!nightSession) throw new ConvexError("Night phase session not found");

    // Resolve the night to killed seats via the variant's night model
    // (docs/game-types.md §2.3). For Japanese this reproduces the previous
    // inline logic verbatim (mafia first, then a distinct yakuza target, each
    // suppressed if it equals the healed seat).
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    const definition = getGameDefinition(game.gameType);

    const killedPlayers = definition.night.resolveKills({
      mafiaTarget: nightSession.mafiaTarget,
      yakuzaTarget: nightSession.yakuzaTarget,
      healedPlayer: nightSession.healedPlayer,
    });

    if (killedPlayers.length === 0) {
      await enterDayPhase(ctx, gameId);
      return { skipToDay: true };
    }

    const randomizedOrder = shuffleArray(killedPlayers);

    await ctx.db.patch(session._id, {
      gamePhase: "farewell_speech",
      speakingOrder: randomizedOrder,
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
    });

    return { skipToDay: false };
  },
});

/**
 * Grant speaking time to the next farewell speaker.
 * Finds the first player in speakingOrder who is still alive.
 */
export const grantFarewellTime = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "farewell_speech") {
      throw new ConvexError("Not in farewell speech phase");
    }

    const speakingOrder = session.speakingOrder ?? [];
    if (speakingOrder.length === 0) throw new ConvexError("No farewell speakers");

    if (session.currentSpeakerIndex !== undefined) {
      throw new ConvexError("Speaker already has time granted");
    }

    const players = await getPlayersByGameId(ctx.db, gameId);
    const aliveMap = new Map<number, boolean>();
    for (const p of players) {
      if (p.seatNumber !== undefined) {
        aliveMap.set(p.seatNumber, p.isAlive);
      }
    }

    const nextSpeaker = speakingOrder.find(
      (seat) => aliveMap.get(seat) === true,
    );
    if (nextSpeaker === undefined) {
      throw new ConvexError("All farewell speeches are done");
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: nextSpeaker,
      speakerStartedAt: new Date().toISOString(),
    });
  },
});

/**
 * Mark the current farewell speaker as dead and reset speaker state.
 */
export const markDeadAndAdvance = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "farewell_speech") {
      throw new ConvexError("Not in farewell speech phase");
    }

    const currentSpeaker = session.currentSpeakerIndex;
    if (currentSpeaker === undefined || (session.speakingOrder ?? []).length === 0) {
      throw new ConvexError("No active farewell speaker");
    }

    const players = await getPlayersByGameId(ctx.db, gameId);
    const player = players.find((p) => p.seatNumber === currentSpeaker);
    if (player) {
      await ctx.db.patch(player._id, { isAlive: false });
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
    });
  },
});

/**
 * Advance from farewell speech to the next phase.
 * - If nominatedPlayers exist → voting farewell → night_phase
 * - Otherwise → night kills farewell → day_phase
 */
export const advanceFromFarewell = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "farewell_speech") {
      throw new ConvexError("Not in farewell speech phase");
    }

    const nominatedPlayers = session.nominatedPlayers ?? [];

    if (nominatedPlayers.length > 0) {
      await enterNightPhase(ctx, gameId);
      return;
    }

    await enterDayPhase(ctx, gameId);
  },
});
