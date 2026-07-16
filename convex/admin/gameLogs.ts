import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import { requirePermission } from "../lib/auth";
import { writeAudit } from "../lib/admin";
import { PERMISSIONS } from "../lib/access";
import { winMethodLabel } from "../lib/winConditions";
import { annulGameLog } from "../lib/games";
import { gameType as gameTypeValidator } from "../tables/games";

/**
 * Admin archive: ALL finished games, newest first, paginated (per-game rows,
 * not per-player). Each row carries the full denormalized roster + roles, so
 * the panel can reveal every player's role. Requires GAME_VIEW_ALL.
 *
 * This is the "match history, but all games and all roles" view — distinct
 * from `game/gameLogs.listMyGameLogs`, which is per-player and self-only.
 */
export const listAllGameLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    gameType: v.optional(gameTypeValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, gameType, search }) => {
    await requirePermission(ctx, PERMISSIONS.GAME_VIEW_ALL);

    const term = search?.trim();
    const base = term
      ? ctx.db
          .query("gameLogs")
          .withSearchIndex("search_gameName", (q) => {
            const s = q.search("gameName", term);
            return gameType ? s.eq("gameType", gameType) : s;
          })
      : (() => {
          const ordered = ctx.db.query("gameLogs").order("desc");
          return gameType
            ? ordered.filter((q) => q.eq(q.field("gameType"), gameType))
            : ordered;
        })();

    const result = await base.paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map((log) => ({
        ...log,
        winMethodLabel: log.winMethod ? winMethodLabel(log.winMethod) : null,
      })),
    };
  },
});

/**
 * Annul a finished game: mark it a no-contest and reverse every player's ELO
 * from that game (winners lose what they gained, losers get back what they
 * lost), then recompute their aggregate stats. Requires GAME_ANNUL (admin).
 *
 * Rejects games that are already no-contest (`winner: null`) — they carry no
 * ELO to reverse, so there is nothing to annul. This also makes the action
 * idempotent: once annulled the winner is null and a re-run is refused. The
 * heavy lifting lives in `annulGameLog` (convex/lib/games.ts).
 */
export const annulGame = mutation({
  args: { gameLogId: v.id("gameLogs") },
  handler: async (ctx, { gameLogId }) => {
    const actor = await requirePermission(ctx, PERMISSIONS.GAME_ANNUL);

    const log = await ctx.db.get(gameLogId);
    if (!log) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Game log not found",
      });
    }
    if (log.winner === null) {
      throw new ConvexError({
        code: "ALREADY_NO_CONTEST",
        message: "This game is already a no-contest and cannot be annulled.",
      });
    }

    const previousWinner = log.winner;
    await annulGameLog(ctx, log);

    await writeAudit(ctx, actor._id, "game.annul", gameLogId, {
      gameCode: log.gameCode,
      gameName: log.gameName,
      previousWinner,
    });
  },
});
