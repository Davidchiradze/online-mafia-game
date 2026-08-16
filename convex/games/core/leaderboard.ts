import { v } from "convex/values";
import { query } from "../../_generated/server";
import { gameType as gameTypeValidator } from "../../tables/games";
import { getAllPlayerStats, mergePlayerStats } from "../../lib/playerStats";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Public ELO leaderboard for one game type, read pre-sorted from the
 * `by_gameType_rating` index (see /docs/ranking-system.md). Anonymous-
 * readable (see `GUEST_VIEWABLE_PATHS` in `convex/lib/access.ts`) — no auth,
 * permission, or subscription gate; nothing downstream reads a caller
 * identity. The "You" highlight is computed client-side from
 * `currentProfile`, which returns `null` for a guest. Players with no rated
 * games have no `playerRatings` row and are deliberately absent (they'd all
 * tie at the 1000 default and bury the board).
 *
 * v1 caveat: `wins`/`losses`/`winRate` are joined from `playerStats`, which is
 * global across game types, not per-gameType — acceptable today because
 * effectively all archived games are `japanese_mafia`.
 */
export const getLeaderboard = query({
  args: {
    gameType: gameTypeValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, limit }) => {
    const take = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_gameType_rating", (q) => q.eq("gameType", gameType))
      .order("desc")
      .take(take);

    return Promise.all(
      ratings.map(async (r) => {
        const profile = await ctx.db.get(r.playerId);
        // A player has one stats row per variant they have played; this board
        // still folds them together (the v1 caveat above). Identical to the
        // old single-row read while only one variant is rated.
        const stats = mergePlayerStats(
          await getAllPlayerStats(ctx.db, r.playerId),
        );
        const wins = stats.wins;
        const losses = stats.losses;
        const decided = wins + losses;

        // Most-played role (tiebreak by wins) with its own win rate — the
        // headline "signature role" shown on the card.
        let topRole: { role: string; matches: number; winRate: number } | null =
          null;
        if (stats.roleStats.length > 0) {
          const best = [...stats.roleStats].sort(
            (a, b) => b.matches - a.matches || b.wins - a.wins,
          )[0];
          const roleDecided = best.wins + best.losses;
          topRole = {
            role: best.role,
            matches: best.matches,
            winRate:
              roleDecided > 0 ? Math.round((best.wins / roleDecided) * 100) : 0,
          };
        }

        return {
          playerId: r.playerId,
          nickname: profile?.nickname ?? "Unknown",
          avatar: profile?.avatar ?? null,
          rating: r.rating,
          peakRating: r.peakRating,
          wins,
          losses,
          winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
          totalMatches: stats.totalMatches,
          currentStreak: stats.currentStreak,
          bestStreak: stats.bestStreak,
          topRole,
        };
      }),
    );
  },
});
