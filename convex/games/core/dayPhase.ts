import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthenticatedUser } from "../../lib/auth";
import {
  assertIsHost,
  getGameById,
  getPlayersByGameId,
  recordWinnerIfDecided,
} from "../../lib/games";
import {
  computeDaySpeakingOrder,
  enterDayPhase as enterDayPhaseTransition,
  enterNightPhase,
  enterVotingPhase,
} from "./phaseTransitions";
import { SPEAKING_STATE, FOULS } from "../../lib/constants";
import { getNextSpeaker } from "./speakingOrder";
import { getGameDefinition } from "../registry";
import { isFirstDayRound } from "./dayRound";
import {
  THIRD_FOUL_BAN_COUNT,
  foulSpeakingBanRound,
} from "./fouls";
import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";

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
 * Enter `day_phase` from the host's neutral-buffer advance (Sports reaches its
 * first day via the deterministic `detective_meet → day_phase` edge, unlike
 * Japanese which always arrives through `startFarewellSpeech`). Delegates to the
 * `enterDayPhase` transition helper so the order is precomputed and the win
 * check runs — the single source of truth for entering day. `startDaySpeaking`
 * then ignites the precomputed order.
 */
export const enterDayPhase = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    await enterDayPhaseTransition(ctx, gameId);
  },
});

/**
 * Enter the Japanese `introduction_phase` — the same speaking round as
 * `day_phase` minus nominations. Precomputes the speaking order + opener (via
 * the shared `computeDaySpeakingOrder`) so it is symmetric with `enterDayPhase`;
 * `currentSpeakerIndex` is left unset until the host clicks Start.
 *
 * Unlike day/night this is client-callable (the host advances into it from the
 * neutral buffer — see `StartNextPhaseButton`), so it lives here as a mutation
 * rather than a `phaseTransitions` helper. No win check: it is the first
 * speaking phase, before any death is possible.
 */
export const enterIntroductionPhase = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const { speakingOrder, openerIndex } = await computeDaySpeakingOrder(
      ctx.db,
      gameId,
      session,
    );

    await ctx.db.patch(session._id, {
      gamePhase: "introduction_phase",
      speakingOrder,
      dayRoundOpenerIndex: openerIndex,
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
      phaseStartedAt: Date.now(),
    });
  },
});

/**
 * Ignites the day/introduction speaking round: the order + opener are already
 * precomputed by `enterDayPhase` / `enterIntroductionPhase`, so this just marks
 * the opener as the active speaker and stamps the start time.
 */
export const startDaySpeaking = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    const session = await getGameSession(ctx.db, gameId);

    const opener = (session.speakingOrder ?? [])[0];
    if (opener === undefined) {
      throw new ConvexError("No speaking order to start");
    }

    await ctx.db.patch(session._id, {
      currentSpeakerIndex: opener,
      speakerStartedAt: new Date().toISOString(),
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

    // Set-based rather than push/filter: the list is the voting candidate
    // list (`enterVotingPhase`) and the self-justification speaking order, and
    // a seat appearing twice there would give it two turns and two ballots.
    const current = new Set(session.nominatedPlayers ?? []);
    if (!current.delete(seatNumber)) current.add(seatNumber);
    const newNominations = [...current];

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
