import { ConvexError } from "convex/values";
import type { DatabaseWriter, MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import {
  getGameById,
  getPlayersByGameId,
  recordWinnerIfDecided,
} from "../../lib/games";
import { computeSpeakingOrder } from "./speakingOrder";

/**
 * Shared phase-transition helpers.
 *
 * These are the SINGLE source of truth for entering `night_phase` and
 * `day_phase`. Every flow that moves the game into night or day must go through
 * `enterNightPhase` / `enterDayPhase` so that all state resets live in one place
 * and the win-condition check (see docs/game-end-conditions.md) has exactly one
 * home per direction.
 *
 * Do NOT set `gamePhase` to "night_phase" / "day_phase" anywhere else
 * (`game/sessions:update` rejects those values for this reason).
 */

async function getGameSessionOrThrow(db: DatabaseWriter, gameId: Id<"games">) {
  const session = await db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session) throw new ConvexError("Game session not found");
  return session;
}

type SessionForOrder = { dayRoundOpenerIndex?: number };

/**
 * Compute the day/introduction speaking order + opener for the current
 * alive+seated roster. Shared by the two speaking-entry points (`enterDayPhase`
 * and `dayPhase:enterIntroductionPhase`) so the ordering rule has exactly one
 * home. No 3rd-foul ban filter — muted players stay in the order as
 * visible-but-inactive stops (the ban is a UI concern).
 */
export async function computeDaySpeakingOrder(
  db: DatabaseWriter,
  gameId: Id<"games">,
  session: SessionForOrder,
) {
  const game = await getGameById(db, gameId);
  const players = await getPlayersByGameId(db, gameId);
  const eligible = players.filter(
    (p) => p.seatNumber !== undefined && p.seatNumber <= game.maxPlayers,
  );
  return computeSpeakingOrder(
    eligible,
    session.dayRoundOpenerIndex ?? null,
    game.maxPlayers,
  );
}

/**
 * Delete the current voting session and its votes, if any.
 * Safe no-op when no voting session exists (e.g. entering night from the
 * intro / continue / foul flows rather than from a vote).
 */
async function clearVotingSession(db: DatabaseWriter, gameId: Id<"games">) {
  const votingSession = await db
    .query("votingSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!votingSession) return;

  const votes = await db
    .query("votes")
    .withIndex("by_votingSessionId", (q) =>
      q.eq("votingSessionId", votingSession._id),
    )
    .collect();
  for (const vote of votes) {
    await db.delete(vote._id);
  }
  await db.delete(votingSession._id);
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

/**
 * Enter `night_phase` (single source of truth).
 *
 * Increments the night number, clears any voting session, resets speaking /
 * nomination / foul state, and ensures the matching `nightPhaseSessions` row
 * exists.
 *
 * Before transitioning, runs the `beforeNight` win check. If a faction has won,
 * the pending winner is recorded and the transition is skipped (the game pauses
 * on the win screen until the host clicks "Finish Game").
 * See docs/game-end-conditions.md.
 *
 * @returns the winning faction if the game is decided, otherwise `null`.
 */
export async function enterNightPhase(ctx: MutationCtx, gameId: Id<"games">) {
  const winner = await recordWinnerIfDecided(ctx, gameId, "beforeNight");
  if (winner) return winner;

  const db = ctx.db;
  const session = await getGameSessionOrThrow(db, gameId);

  await clearVotingSession(db, gameId);

  const newNightNumber = (session.currentNightNumber || 0) + 1;

  await db.patch(session._id, {
    gamePhase: "night_phase",
    currentNightNumber: newNightNumber,
    speakingOrder: [],
    currentSpeakerIndex: undefined,
    speakerStartedAt: undefined,
    nominatedPlayers: [],
    foulEliminationOccurred: false,
  });

  await createNightSessionIfNeeded(db, gameId, newNightNumber);

  return null;
}

/**
 * Enter `voting` (single source of truth).
 *
 * Creates the voting session (with the given nominees as candidates) if one does
 * not already exist, and resets speaking state. Used both when self-justification
 * speaking finishes and when it is skipped (single nominee).
 */
export async function enterVotingPhase(
  ctx: MutationCtx,
  gameId: Id<"games">,
  candidates: number[],
) {
  const db = ctx.db;
  const session = await getGameSessionOrThrow(db, gameId);

  const existingVoting = await db
    .query("votingSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();

  if (!existingVoting) {
    await db.insert("votingSessions", {
      gameId,
      candidates,
      roundNumber: 1,
      currentCandidateIndex: 0,
      votingActive: false,
      isTieBreak: false,
      tieBreakRound: 0,
      bothLeaveVoteActive: false,
      playersWhoVoted: [],
    });
  }

  await db.patch(session._id, {
    gamePhase: "voting",
    currentSpeakerIndex: undefined,
    speakerStartedAt: undefined,
    speakingOrder: [],
  });
}

/**
 * Enter `day_phase` (single source of truth).
 *
 * Precomputes the day speaking order (and opener) so host controls can preview
 * who opens before the host clicks Start. `currentSpeakerIndex` is left
 * `undefined` — the order is the *plan*, and `startDaySpeaking` *ignites* it.
 * Called after night kills (or the no-kill skip).
 *
 * The Japanese `introduction_phase` is the same speaking round minus
 * nominations; it precomputes symmetrically via `dayPhase:enterIntroductionPhase`
 * (both share `computeDaySpeakingOrder`). `startDaySpeaking` is then a pure
 * igniter for either entry.
 *
 * Before transitioning, runs the `beforeDay` win check. If a faction has won,
 * the pending winner is recorded and the transition is skipped (the game pauses
 * on the win screen until the host clicks "Finish Game").
 * See docs/game-end-conditions.md.
 *
 * @returns the winning faction if the game is decided, otherwise `null`.
 */
export async function enterDayPhase(ctx: MutationCtx, gameId: Id<"games">) {
  const winner = await recordWinnerIfDecided(ctx, gameId, "beforeDay");
  if (winner) return winner;

  const db = ctx.db;
  const session = await getGameSessionOrThrow(db, gameId);

  // All-dead is already caught by the `beforeDay` win check, so an empty order
  // is fine here — `startDaySpeaking` validates it on ignite.
  const { speakingOrder, openerIndex } = await computeDaySpeakingOrder(
    db,
    gameId,
    session,
  );

  await db.patch(session._id, {
    gamePhase: "day_phase",
    speakingOrder,
    dayRoundOpenerIndex: openerIndex,
    currentSpeakerIndex: undefined,
    speakerStartedAt: undefined,
  });

  return null;
}
