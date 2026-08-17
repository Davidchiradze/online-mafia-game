import { ConvexError, v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getAuthenticatedUser } from "../../lib/auth";
import { assertIsHost, getPlayersByGameId } from "../../lib/games";
import { enterNightPhase, enterDayPhase } from "./phaseTransitions";
import { getGameDefinition } from "../registry";
import { isBestMoveEligible } from "../sports/bestMove";
import type { GameDefinition } from "./types";
import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";
import { GamePhase } from "../../lib/constants";

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

/**
 * Seats of living players in the mafia faction, per the variant's own
 * `roleToFaction`. Used by the Sports `unanimous-vote` night model to decide
 * whether every living mafia submitted a selection (docs/variants/sports/rules.md §5.2).
 */
async function getLivingMafiaSeats(
  db: DatabaseReader,
  gameId: Id<"games">,
  definition: GameDefinition,
): Promise<number[]> {
  const players = await getPlayersByGameId(db, gameId);
  const roleRows = await db
    .query("gamePlayerRoles")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
  const roleByPlayer = new Map(roleRows.map((r) => [r.playerId, r.role]));

  const seats: number[] = [];
  for (const p of players) {
    if (!p.isAlive || p.seatNumber === undefined) continue;
    const role = roleByPlayer.get(p.playerId);
    if (role && definition.roleToFaction(role) === "mafia") {
      seats.push(p.seatNumber);
    }
  }
  return seats;
}

/**
 * Dead SEATED players — the Sports best-move eligibility input
 * (docs/variants/sports/rules.md §6.1 condition 3).
 *
 * Counted at the moment the night resolves, this IS the day-1 elimination count:
 * the night's victim is still `isAlive: true` here (they only flip in
 * `markDeadAndAdvance`, during the farewell).
 *
 * The seat filter matters — the host holds a seat ABOVE `maxPlayers` (11 in
 * Sports, 13 in Japanese) and must never be counted. Same idiom as
 * `sessions:startGame` and `computeDaySpeakingOrder`.
 */
async function countDeadSeatedPlayers(
  db: DatabaseReader,
  gameId: Id<"games">,
  maxPlayers: number,
): Promise<number> {
  const players = await getPlayersByGameId(db, gameId);
  return players.filter(
    (p) =>
      p.seatNumber !== undefined &&
      p.seatNumber >= 1 &&
      p.seatNumber <= maxPlayers &&
      !p.isAlive,
  ).length;
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
    // (docs/engine/variant-architecture.md §2.3). For Japanese this reproduces the previous
    // inline logic verbatim (mafia first, then a distinct yakuza target, each
    // suppressed if it equals the healed seat).
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    const definition = getGameDefinition(game.gameType);

    let killedPlayers: number[];
    if (definition.night.kind === "unanimous-vote") {
      // Sports: resolve from the per-mafia selections + living-mafia roster.
      const livingMafiaSeats = await getLivingMafiaSeats(
        ctx.db,
        gameId,
        definition,
      );
      killedPlayers = definition.night.resolveKills(
        { mafiaTargetSelections: nightSession.mafiaTargetSelections },
        { livingMafiaSeats },
      );
    } else {
      // Japanese (single-authority): unchanged — read the scalar targets.
      killedPlayers = definition.night.resolveKills({
        mafiaTarget: nightSession.mafiaTarget,
        yakuzaTarget: nightSession.yakuzaTarget,
        healedPlayer: nightSession.healedPlayer,
      });
    }

    if (killedPlayers.length === 0) {
      await enterDayPhase(ctx, gameId);
      return { skipToDay: true };
    }

    const randomizedOrder = shuffleArray(killedPlayers);

    // Sports best move (docs/variants/sports/rules.md §6): the FIRST night's victim names
    // 3 suspects before the farewell. A third destination on the branch this
    // mutation already has — `speakingOrder` is set either way, so advancing
    // `best_move → farewell_speech` later is a bare `gamePhase` patch and the
    // farewell flow below is untouched.
    if (
      definition.flags.hasBestMove &&
      isBestMoveEligible({
        nightNumber,
        killedSeatCount: killedPlayers.length,
        deadSeatedCount: await countDeadSeatedPlayers(
          ctx.db,
          gameId,
          game.maxPlayers,
        ),
      })
    ) {
      await ctx.db.patch(session._id, {
        gamePhase: GamePhase.BEST_MOVE,
        speakingOrder: randomizedOrder,
        currentSpeakerIndex: undefined,
        speakerStartedAt: undefined,
        // Stamped explicitly: this mutation patches the session directly rather
        // than through `sessions:update` (which is what normally stamps it), and
        // the best-move countdown reads it.
        phaseStartedAt: Date.now(),
      });
      await ctx.db.patch(nightSession._id, {
        bestMoveSeat: randomizedOrder[0],
        bestMoveSuspects: [],
      });
      return { skipToDay: false, bestMove: true };
    }

    await ctx.db.patch(session._id, {
      gamePhase: GamePhase.FAREWELL_SPEECH,
      speakingOrder: randomizedOrder,
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
    });

    // NOTE: no `bestMove` key on this path on purpose — the return shape for a
    // plain night kill stays exactly what it was, so the Japanese
    // characterization tests keep passing unmodified.
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

    if (session.gamePhase !== GamePhase.FAREWELL_SPEECH) {
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

    if (session.gamePhase !== GamePhase.FAREWELL_SPEECH) {
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

    if (session.gamePhase !== GamePhase.FAREWELL_SPEECH) {
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
