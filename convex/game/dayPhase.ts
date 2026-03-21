import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { assertIsHost, getGameById, getPlayersByGameId } from "../lib/games";
import { SPEAKING_STATE, FOULS } from "../lib/constants";
import { computeSpeakingOrder, getNextSpeaker } from "../lib/speakingOrder";
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "../_generated/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getGameSession(db: DatabaseReader, gameId: Id<"games">) {
  const session = await db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session) throw new Error("Game session not found");
  return session;
}

async function createNightSessionIfNeeded(
  db: DatabaseWriter,
  gameId: Id<"games">,
  nightNumber: number,
) {
  const existing = await db
    .query("nightPhaseSessions")
    .withIndex("by_gameId_nightNumber", (q) =>
      q.eq("gameId", gameId).eq("nightNumber", nightNumber),
    )
    .unique();

  if (!existing) {
    await db.insert("nightPhaseSessions", { gameId, nightNumber });
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Starts the day speaking round.
 * Computes circular speaking order based on alive players and previous opener.
 */
export const startDaySpeaking = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const players = await getPlayersByGameId(ctx.db, gameId);
    const maxSeats = game.maxPlayers;

    const gamePlayers = players.filter(
      (p) => p.seatNumber !== undefined && p.seatNumber <= maxSeats,
    );

    const previousOpener = session.dayRoundOpenerIndex ?? null;
    const { speakingOrder, openerIndex } = computeSpeakingOrder(
      gamePlayers,
      previousOpener,
      maxSeats,
    );

    if (speakingOrder.length === 0) {
      throw new Error("No alive players to speak");
    }

    await ctx.db.patch(session._id, {
      dayRoundOpenerIndex: openerIndex,
      currentSpeakerIndex: openerIndex,
      speakerStartedAt: new Date().toISOString(),
      speakingOrder,
    });
  },
});

/**
 * Advances to the next speaker, or marks speaking as completed.
 */
export const advanceSpeaker = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const speakingOrder = session.speakingOrder ?? [];
    const currentSpeaker = session.currentSpeakerIndex ?? null;

    if (currentSpeaker === null || speakingOrder.length === 0) {
      throw new Error("No active speaking session");
    }

    const lastSpeaker = SPEAKING_STATE.isPaused(currentSpeaker)
      ? SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker)
      : currentSpeaker;

    const nextSpeaker = getNextSpeaker(lastSpeaker, speakingOrder);

    if (nextSpeaker === null) {
      await ctx.db.patch(session._id, {
        currentSpeakerIndex: SPEAKING_STATE.COMPLETED,
        speakerStartedAt: undefined,
      });
      return;
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: nextSpeaker,
      speakerStartedAt: new Date().toISOString(),
    });
  },
});

/**
 * Pauses the current speaker without advancing. Host clicks "Next" to continue.
 */
export const finishCurrentSpeaker = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const currentSpeaker = session.currentSpeakerIndex ?? null;
    const speakingOrder = session.speakingOrder ?? [];

    if (!SPEAKING_STATE.isActive(currentSpeaker) || speakingOrder.length === 0) {
      throw new Error("No active speaker to finish");
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: SPEAKING_STATE.toPausedValue(currentSpeaker!),
      speakerStartedAt: undefined,
    });
  },
});

/**
 * Resets speaking state (clears order + speaker). Keeps dayRoundOpenerIndex.
 */
export const resetSpeakingState = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
      speakingOrder: [],
    });
  },
});

/**
 * Toggles a player's nomination during day_phase.
 * Blocked if a foul elimination occurred this round.
 */
export const nominatePlayer = mutation({
  args: {
    gameId: v.id("games"),
    seatNumber: v.number(),
  },
  handler: async (ctx, { gameId, seatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "day_phase") {
      throw new Error("Nominations only allowed during day phase");
    }

    if (session.foulEliminationOccurred) {
      throw new Error(
        "Nominations blocked - player eliminated by fouls this round",
      );
    }

    const current = session.nominatedPlayers ?? [];
    const newNominations = current.includes(seatNumber)
      ? current.filter((s) => s !== seatNumber)
      : [...current, seatNumber];

    await ctx.db.patch(session._id, { nominatedPlayers: newNominations });
  },
});

/**
 * Clears all nominations.
 */
export const clearNominations = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    await ctx.db.patch(session._id, { nominatedPlayers: [] });
  },
});

/**
 * Transitions from day_phase → nominated_players_speak.
 * Uses nominated_players order as speaking order.
 */
export const startNominatedPlayersSpeaking = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "day_phase") {
      throw new Error("Can only start nominated players speaking from day phase");
    }

    const nominatedPlayers = session.nominatedPlayers ?? [];
    if (nominatedPlayers.length === 0) {
      throw new Error("No players nominated");
    }

    await ctx.db.patch(session._id, {
      gamePhase: "nominated_players_speak",
      speakingOrder: nominatedPlayers,
      currentSpeakerIndex: nominatedPlayers[0],
      speakerStartedAt: new Date().toISOString(),
    });
  },
});

/**
 * Advances to the next nominated speaker.
 * When all have spoken → creates voting session and transitions to voting.
 * If foul elimination occurred → skips to night phase.
 */
export const advanceNominatedSpeaker = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "nominated_players_speak") {
      throw new Error("Not in nominated players speaking phase");
    }

    if (session.foulEliminationOccurred) {
      const newNightNumber = (session.currentNightNumber || 0) + 1;

      await ctx.db.patch(session._id, {
        gamePhase: "night_phase",
        currentNightNumber: newNightNumber,
        currentSpeakerIndex: undefined,
        speakerStartedAt: undefined,
        speakingOrder: [],
        nominatedPlayers: [],
        foulEliminationOccurred: false,
      });

      await createNightSessionIfNeeded(ctx.db, gameId, newNightNumber);
      return;
    }

    const speakingOrder = session.speakingOrder ?? [];
    const currentSpeaker = session.currentSpeakerIndex ?? null;

    if (currentSpeaker === null || speakingOrder.length === 0) {
      throw new Error("No active speaking session");
    }

    const lastSpeaker = SPEAKING_STATE.isPaused(currentSpeaker)
      ? SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker)
      : currentSpeaker;

    const nextSpeaker = getNextSpeaker(lastSpeaker, speakingOrder);

    if (nextSpeaker === null) {
      const nominatedPlayers = session.nominatedPlayers ?? [];

      const existingVoting = await ctx.db
        .query("votingSessions")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();

      if (!existingVoting) {
        await ctx.db.insert("votingSessions", {
          gameId,
          candidates: nominatedPlayers,
          roundNumber: 1,
          currentCandidateIndex: 0,
          votingActive: false,
          isTieBreak: false,
          tieBreakRound: 0,
          bothLeaveVoteActive: false,
          playersWhoVoted: [],
        });
      }

      await ctx.db.patch(session._id, {
        gamePhase: "voting",
        currentSpeakerIndex: undefined,
        speakerStartedAt: undefined,
        speakingOrder: [],
      });
      return;
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: nextSpeaker,
      speakerStartedAt: new Date().toISOString(),
    });
  },
});

/**
 * Pauses the current nominated speaker without advancing.
 */
export const finishCurrentNominatedSpeaker = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "nominated_players_speak") {
      throw new Error("Not in nominated players speaking phase");
    }

    const currentSpeaker = session.currentSpeakerIndex ?? null;
    const speakingOrder = session.speakingOrder ?? [];

    if (!SPEAKING_STATE.isActive(currentSpeaker) || speakingOrder.length === 0) {
      throw new Error("No active speaker to finish");
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: SPEAKING_STATE.toPausedValue(currentSpeaker!),
      speakerStartedAt: undefined,
    });
  },
});

/**
 * Gives a foul to a player. 4th foul eliminates without farewell speech.
 */
export const giveFoul = mutation({
  args: {
    gameId: v.id("games"),
    seatNumber: v.number(),
  },
  handler: async (ctx, { gameId, seatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const allowedPhases = FOULS.ALLOWED_PHASES as readonly string[];
    if (!allowedPhases.includes(session.gamePhase)) {
      throw new Error("Fouls not allowed during this phase");
    }

    const players = await getPlayersByGameId(ctx.db, gameId);
    const player = players.find((p) => p.seatNumber === seatNumber);
    if (!player) throw new Error("Player not found");
    if (!player.isAlive) throw new Error("Cannot foul a dead player");

    const currentFouls = player.fouls ?? 0;
    if (currentFouls >= FOULS.ELIMINATION_THRESHOLD) {
      throw new Error("Player already eliminated by fouls");
    }

    const newFoulCount = currentFouls + 1;
    await ctx.db.patch(player._id, { fouls: newFoulCount });

    if (newFoulCount === FOULS.ELIMINATION_THRESHOLD) {
      await ctx.db.patch(player._id, { isAlive: false });
      await ctx.db.patch(session._id, { foulEliminationOccurred: true });
      return { playerEliminated: true };
    }

    return { playerEliminated: false };
  },
});
