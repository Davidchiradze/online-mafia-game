import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { winMethodLabel } from "../lib/winConditions";
import { gameType as gameTypeValidator } from "../tables/games";
import type { Doc } from "../_generated/dataModel";

/** Attach the derived human label to a game-log record for convenience. */
function withLabel(log: Doc<"gameLogs">) {
  return {
    ...log,
    winMethodLabel: log.winMethod ? winMethodLabel(log.winMethod) : null,
  };
}

/** Win rate as a 0–100 integer, excluding no-contests. */
function winRatePct(wins: number, losses: number): number {
  const decided = wins + losses;
  return decided === 0 ? 0 : Math.round((wins / decided) * 100);
}

/**
 * The current user's paginated match history (10/page), newest first, with an
 * optional outcome and game-mode filter. Rows are self-contained list-card data
 * (no parent fetch) — the full roster is loaded lazily via `getGameLog`.
 */
export const listMyGameLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    outcome: v.union(
      v.literal("all"),
      v.literal("win"),
      v.literal("loss"),
      v.literal("no_contest"),
    ),
    gameType: v.optional(gameTypeValidator),
  },
  handler: async (ctx, { paginationOpts, outcome, gameType }) => {
    const userId = await getAuthenticatedUser(ctx);

    const indexed =
      outcome === "all"
        ? ctx.db
            .query("gameLogPlayers")
            .withIndex("by_playerId", (q) => q.eq("playerId", userId))
        : ctx.db
            .query("gameLogPlayers")
            .withIndex("by_playerId_outcome", (q) =>
              q.eq("playerId", userId).eq("outcome", outcome),
            );

    const ordered = indexed.order("desc");
    const filtered = gameType
      ? ordered.filter((q) => q.eq(q.field("gameType"), gameType))
      : ordered;

    const result = await filtered.paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map((row) => ({
        ...row,
        winMethodLabel: row.winMethod ? winMethodLabel(row.winMethod) : null,
      })),
    };
  },
});

/**
 * A single finished game's full log (roster, roles, winner, win method).
 * Visible to participants and the host of that game. Loaded lazily when a
 * history row is expanded.
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
      throw new ConvexError("Not authorized to view this game log");
    }

    // Avatars aren't part of the frozen snapshot — join the player's current
    // profile photo so the roster shows up-to-date faces.
    const players = await Promise.all(
      log.players.map(async (p) => {
        const profile = await ctx.db.get(p.playerId);
        return { ...p, avatar: profile?.avatar };
      }),
    );

    return { ...withLabel(log), players };
  },
});

/**
 * The current user's aggregate statistics, read O(1) from the incrementally
 * maintained `playerStats` row. Win rates are derived here (no-contests
 * excluded). Returns zeros if the player has no finished games yet.
 */
export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUser(ctx);

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_playerId", (q) => q.eq("playerId", userId))
      .unique();

    if (!stats) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        noContests: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        roleStats: [] as Array<{
          role: string;
          matches: number;
          wins: number;
          losses: number;
          winRate: number;
        }>,
      };
    }

    return {
      totalMatches: stats.totalMatches,
      wins: stats.wins,
      losses: stats.losses,
      noContests: stats.noContests,
      winRate: winRatePct(stats.wins, stats.losses),
      currentStreak: stats.currentStreak ?? 0,
      bestStreak: stats.bestStreak ?? 0,
      roleStats: stats.roleStats
        .map((r) => ({ ...r, winRate: winRatePct(r.wins, r.losses) }))
        .sort((a, b) => b.matches - a.matches),
    };
  },
});
