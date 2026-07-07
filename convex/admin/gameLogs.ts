import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { requirePermission } from "../lib/auth";
import { PERMISSIONS } from "../lib/access";
import { winMethodLabel } from "../lib/winConditions";
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
