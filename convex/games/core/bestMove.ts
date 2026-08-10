import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthenticatedUser } from "../../lib/auth";
import { getPlayerInGame, getPlayersByGameId } from "../../lib/games";
import { SPORTS } from "../../lib/constants";
import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";

/**
 * Sports "best move" (docs/variants/sports.md §6) — the first-night victim names 3
 * players they believe are mafia, before their farewell speech.
 *
 * A DAWN action, not a night action (hence its own file rather than living in
 * `sportsNightPhase.ts`): the phase is entered from `startFarewellSpeech`, which
 * routes to `best_move` when the night-1 kill qualifies (§6.1) and stamps
 * `bestMoveSeat` on the night session.
 *
 * Two deliberate contrasts with the mafia kill selections (§5.4):
 *  - **Public.** The marks show live to everyone — a real table hears the victim
 *    announce their three seats. There is no read function here: `bestMoveSeat` /
 *    `bestMoveSuspects` already arrive through the reactive `nightPhase.getCurrent`
 *    session the UI consumes as `nightPhaseSession`.
 *  - **Toggleable until full.** A pick can be un-marked while fewer than 3 are
 *    marked (mis-tap recovery); reaching 3 LOCKS the set, which is the phase's
 *    completion signal. The mafia kill is one-shot instead.
 *
 * The host's advance is always enabled (§6.3), so a disconnected or AFK victim
 * can never deadlock the game — a partial set is simply kept as-is.
 */

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

async function getNightSession(
  db: DatabaseReader,
  gameId: Id<"games">,
  nightNumber: number,
) {
  return await db
    .query("nightPhaseSessions")
    .withIndex("by_gameId_nightNumber", (q) =>
      q.eq("gameId", gameId).eq("nightNumber", nightNumber),
    )
    .unique();
}

// ---------------------------------------------------------------------------
// Victim-only mutation: mark / un-mark a suspect (locked once 3 are marked)
// ---------------------------------------------------------------------------

export const toggleSuspect = mutation({
  args: {
    gameId: v.id("games"),
    seatNumber: v.number(),
  },
  handler: async (ctx, { gameId, seatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== "best_move") {
      throw new ConvexError("Not in the best move phase");
    }
    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");

    const nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) throw new ConvexError("Night phase session not found");
    if (nightSession.bestMoveSeat === undefined) {
      throw new ConvexError("No best move was granted this night");
    }

    // Only the player who was granted the best move may pick — not the host,
    // not another player.
    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player || player.seatNumber === undefined) {
      throw new ConvexError("Player not found in game");
    }
    if (player.seatNumber !== nightSession.bestMoveSeat) {
      throw new ConvexError("Only the killed player can choose the best move");
    }
    if (seatNumber === player.seatNumber) {
      throw new ConvexError("You cannot choose yourself");
    }

    // Target must be a seated non-host player. DEAD players stay valid: a day-1
    // vote-out can be mafia, so naming them is a legitimate best move (§6.2).
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    const players = await getPlayersByGameId(ctx.db, gameId);
    const target = players.find(
      (p) =>
        p.seatNumber === seatNumber &&
        p.seatNumber >= 1 &&
        p.seatNumber <= game.maxPlayers,
    );
    if (!target) throw new ConvexError("Target player not found");

    const current = nightSession.bestMoveSuspects ?? [];

    // Un-mark: allowed at any size, so a mis-tap is recoverable.
    if (current.includes(seatNumber)) {
      await ctx.db.patch(nightSession._id, {
        bestMoveSuspects: current.filter((s) => s !== seatNumber),
      });
      return;
    }

    // Mark: locked once the full set is in (that IS the confirmation, §6.2).
    if (current.length >= SPORTS.BEST_MOVE_SUSPECT_COUNT) {
      throw new ConvexError(
        `Your best move is final — ${SPORTS.BEST_MOVE_SUSPECT_COUNT} players already chosen`,
      );
    }
    await ctx.db.patch(nightSession._id, {
      bestMoveSuspects: [...current, seatNumber],
    });
  },
});
