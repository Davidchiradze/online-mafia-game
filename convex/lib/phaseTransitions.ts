import type { DatabaseWriter } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

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
  if (!session) throw new Error("Game session not found");
  return session;
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
 * TODO(win-conditions): before transitioning, run the `beforeNight` win check
 * here; if a faction has won, finish the game instead of advancing.
 * See docs/game-end-conditions.md.
 */
export async function enterNightPhase(db: DatabaseWriter, gameId: Id<"games">) {
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
}

/**
 * Enter `day_phase` (single source of truth).
 *
 * Resets speaking state. Called after night kills (or the no-kill skip).
 *
 * TODO(win-conditions): before transitioning, run the `beforeDay` win check
 * here; if a faction has won, finish the game instead of advancing.
 * See docs/game-end-conditions.md.
 */
export async function enterDayPhase(db: DatabaseWriter, gameId: Id<"games">) {
  const session = await getGameSessionOrThrow(db, gameId);

  await db.patch(session._id, {
    gamePhase: "day_phase",
    speakingOrder: [],
    currentSpeakerIndex: undefined,
    speakerStartedAt: undefined,
  });
}
