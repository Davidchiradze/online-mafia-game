import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { winMethodLabel } from "../lib/winConditions";
import type { Doc } from "../_generated/dataModel";

/** Attach the derived human label to a game-log record for convenience. */
function withLabel(log: Doc<"gameLogs">) {
  return {
    ...log,
    winMethodLabel: log.winMethod ? winMethodLabel(log.winMethod) : null,
  };
}

/**
 * The current user's match history — every finished game they played in,
 * most recent first.
 */
export const getMyGameLogs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUser(ctx);

    const entries = await ctx.db
      .query("gameLogPlayers")
      .withIndex("by_playerId", (q) => q.eq("playerId", userId))
      .collect();

    entries.sort((a, b) => b.finishedAt - a.finishedAt);

    const logs = await Promise.all(
      entries.map((e) => ctx.db.get(e.gameLogId)),
    );

    return logs
      .filter((log): log is Doc<"gameLogs"> => log !== null)
      .map(withLabel);
  },
});

/**
 * A single finished game's full log (roster, roles, winner, win method).
 * Visible to participants and the host of that game.
 */
export const getGameLog = query({
  args: { gameLogId: v.id("gameLogs") },
  handler: async (ctx, { gameLogId }) => {
    const userId = await getAuthenticatedUser(ctx);

    const log = await ctx.db.get(gameLogId);
    if (!log) return null;

    const isHost = log.hostId === userId;
    const isParticipant = log.players.some((p) => p.playerId === userId);
    if (!isHost && !isParticipant) {
      throw new Error("Not authorized to view this game log");
    }

    return withLabel(log);
  },
});
