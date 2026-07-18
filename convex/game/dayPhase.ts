import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import {
  assertIsHost,
  getGameById,
  getPlayersByGameId,
  recordWinnerIfDecided,
} from "../lib/games";
import { enterNightPhase, enterVotingPhase } from "../lib/phaseTransitions";
import { SPEAKING_STATE, FOULS } from "../lib/constants";
import { computeSpeakingOrder, getNextSpeaker } from "../lib/speakingOrder";
import { getGameDefinition } from "../games/registry";
import { isFirstDayRound } from "../games/core/dayRound";
import {
  THIRD_FOUL_BAN_COUNT,
  foulSpeakingBanRound,
} from "../games/core/fouls";
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

    // Ignite-or-compute. `enterDayPhase` precomputes the order and leaves
    // `currentSpeakerIndex` undefined, so a populated order with a null index is
    // the fresh, not-yet-started day-phase state — just ignite it. Otherwise
    // (Japanese `introduction_phase`, which never runs `enterDayPhase`, or a
    // re-start after the round COMPLETED) compute the order now. Banned players
    // are NOT filtered out — muted players stay in the order as visible stops
    // (the 3rd-foul ban is handled in the UI).
    const precomputed = session.speakingOrder ?? [];
    const isFreshPrecomputed =
      precomputed.length > 0 && session.currentSpeakerIndex == null;

    let speakingOrder: number[];
    let openerIndex: number;
    if (isFreshPrecomputed) {
      speakingOrder = precomputed;
      openerIndex = precomputed[0];
    } else {
      const players = await getPlayersByGameId(ctx.db, gameId);
      const eligible = players.filter(
        (p) => p.seatNumber !== undefined && p.seatNumber <= game.maxPlayers,
      );
      ({ speakingOrder, openerIndex } = computeSpeakingOrder(
        eligible,
        session.dayRoundOpenerIndex ?? null,
        game.maxPlayers,
      ));
      if (speakingOrder.length === 0) {
        throw new ConvexError("No alive players to speak");
      }
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
      throw new ConvexError("No active speaking session");
    }

    const players = await getPlayersByGameId(ctx.db, gameId);
    const aliveSeats = new Set(
      players.filter((p) => p.isAlive).map((p) => p.seatNumber),
    );

    const lastSpeaker = SPEAKING_STATE.isPaused(currentSpeaker)
      ? SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker)
      : currentSpeaker;

    const nextSpeaker = getNextSpeaker(lastSpeaker, speakingOrder, aliveSeats);

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

    if (
      !SPEAKING_STATE.isActive(currentSpeaker) ||
      speakingOrder.length === 0
    ) {
      throw new ConvexError("No active speaker to finish");
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: SPEAKING_STATE.toPausedValue(currentSpeaker!),
      speakerStartedAt: undefined,
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
      throw new ConvexError("Nominations only allowed during day phase");
    }

    if (session.foulEliminationOccurred) {
      throw new ConvexError(
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
    const game = await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    if (session.gamePhase !== "day_phase") {
      throw new ConvexError(
        "Can only start nominated players speaking from day phase",
      );
    }

    const nominatedPlayers = session.nominatedPlayers ?? [];
    if (nominatedPlayers.length === 0) {
      throw new ConvexError("No players nominated");
    }

    // Variant single-nominee rule (Sports §4.1), gated on the definition flag.
    // Day 1: a lone nominee is NOT eliminated → skip voting straight to night.
    // Day 2+: a lone nominee is eliminated without a vote → farewell speech,
    // then night (advanceFromFarewell routes to night while nominatedPlayers is
    // non-empty). Japanese leaves the flag false → falls through to the shared
    // behavior below (a single nominee still goes to voting).
    const definition = getGameDefinition(game.gameType);
    if (
      definition.flags.firstDaySingleNomineeSkipsToNight &&
      nominatedPlayers.length === 1
    ) {
      if (isFirstDayRound(session.currentNightNumber)) {
        await enterNightPhase(ctx, gameId);
      } else {
        await ctx.db.patch(session._id, {
          gamePhase: "farewell_speech",
          speakingOrder: [nominatedPlayers[0]],
          currentSpeakerIndex: undefined,
          speakerStartedAt: undefined,
        });
      }
      return;
    }

    // Skip self-justification when the host disabled it, or when there is a
    // single nominee (no defense needed) → go straight to voting.
    if (session.withoutSelfJustification || nominatedPlayers.length === 1) {
      await enterVotingPhase(ctx, gameId, nominatedPlayers);
      return;
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
      throw new ConvexError("Not in nominated players speaking phase");
    }

    if (session.foulEliminationOccurred) {
      await enterNightPhase(ctx, gameId);
      return;
    }

    const speakingOrder = session.speakingOrder ?? [];
    const currentSpeaker = session.currentSpeakerIndex ?? null;

    if (currentSpeaker === null || speakingOrder.length === 0) {
      throw new ConvexError("No active speaking session");
    }

    const players = await getPlayersByGameId(ctx.db, gameId);
    const aliveSeats = new Set(
      players.filter((p) => p.isAlive).map((p) => p.seatNumber),
    );

    const lastSpeaker = SPEAKING_STATE.isPaused(currentSpeaker)
      ? SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker)
      : currentSpeaker;

    const nextSpeaker = getNextSpeaker(lastSpeaker, speakingOrder, aliveSeats);

    if (nextSpeaker === null) {
      const nominatedPlayers = session.nominatedPlayers ?? [];
      await enterVotingPhase(ctx, gameId, nominatedPlayers);
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
      throw new ConvexError("Not in nominated players speaking phase");
    }

    const currentSpeaker = session.currentSpeakerIndex ?? null;
    const speakingOrder = session.speakingOrder ?? [];

    if (
      !SPEAKING_STATE.isActive(currentSpeaker) ||
      speakingOrder.length === 0
    ) {
      throw new ConvexError("No active speaker to finish");
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
    const game = await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const allowedPhases = FOULS.ALLOWED_PHASES as readonly string[];
    if (!allowedPhases.includes(session.gamePhase)) {
      throw new ConvexError("Fouls not allowed during this phase");
    }

    const players = await getPlayersByGameId(ctx.db, gameId);
    const player = players.find((p) => p.seatNumber === seatNumber);
    if (!player) throw new ConvexError("Player not found");
    if (!player.isAlive) throw new ConvexError("Cannot foul a dead player");

    const currentFouls = player.fouls ?? 0;
    if (currentFouls >= FOULS.ELIMINATION_THRESHOLD) {
      throw new ConvexError("Player already eliminated by fouls");
    }

    const newFoulCount = currentFouls + 1;
    await ctx.db.patch(player._id, { fouls: newFoulCount });

    // 3rd-foul speaking ban (Sports §4.2): mute the player from their day speech
    // on the NEXT day phase. Gated on the definition flag; Japanese never sets
    // this. The 4th-foul elimination below is retained across all variants.
    const definition = getGameDefinition(game.gameType);
    if (
      definition.flags.thirdFoulSpeakingBan &&
      newFoulCount === THIRD_FOUL_BAN_COUNT
    ) {
      await ctx.db.patch(player._id, {
        foulSpeakingBanRound: foulSpeakingBanRound(session.currentNightNumber),
      });
    }

    if (newFoulCount === FOULS.ELIMINATION_THRESHOLD) {
      await ctx.db.patch(player._id, { isAlive: false });
      await ctx.db.patch(session._id, { foulEliminationOccurred: true });

      // A foul elimination can remove the last Mafia/Yakuza, deciding the game
      // immediately (outside any night/day boundary). Foul-allowed phases all
      // head toward night, so use the `beforeNight` context. This records the
      // pending winner; the host still confirms via "Finish Game".
      const winner = await recordWinnerIfDecided(ctx, gameId, "beforeNight");

      return { playerEliminated: true, winnerDecided: winner !== null };
    }

    return { playerEliminated: false };
  },
});
