import { v } from "convex/values";
import { query } from "../_generated/server";
import { requirePermission } from "../lib/auth";
import { PERMISSIONS } from "../lib/access";
import { isSubscriptionActiveByDate } from "../lib/entitlements";
import { mergePlayerStats } from "../lib/playerStats";
import { winMethodLabel } from "../games/core/winConditions";
import type { Doc, Id } from "../_generated/dataModel";

/* ============================================================================
 * ADMIN DASHBOARD ANALYTICS
 *
 * Reactive, read-only aggregation queries powering the /admin dashboard.
 *
 * PERF: every query here aggregates on read via `.collect()` + reduce. That is
 * fine at the current data volume (admin-only, low traffic, modest tables). If
 * `gameLogs` / `playerStats` / `profiles` grow large, migrate the hot ones to a
 * denormalized aggregates document maintained incrementally inside
 * `archiveGameLog` (convex/lib/games.ts) — the same pattern `playerStats`
 * already uses. Reads would then be O(1) regardless of history size.
 * ========================================================================== */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Faction = "mafia" | "yakuza" | "citizens" | "serial_killer";

/** Headline counts for the KPI strip. Requires USER_VIEW (admin panel roles). */
export const overviewKpis = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.USER_VIEW);
    const now = Date.now();

    const [profiles, games, gameLogs, stats] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("games").collect(),
      ctx.db.query("gameLogs").collect(),
      ctx.db.query("playerStats").collect(),
    ]);

    const newThisWeek = profiles.filter(
      (p) => p.createdAt > now - WEEK_MS,
    ).length;
    const banned = profiles.filter((p) => p.bannedAt != null).length;
    // Count by the subscription END DATE, not the synced `active` flag: PHP only
    // refreshes `active` on a page visit, so a user who never returns keeps a
    // stale `active === true` long after their `to` date passed. The date is the
    // source of truth for reporting. See isSubscriptionActiveByDate.
    const subscribers = profiles.filter((p) =>
      isSubscriptionActiveByDate(p.subscription, now),
    ).length;

    const activeGames = games.filter((g) => g.gameStatus === "playing").length;
    const waitingGames = games.filter(
      (g) => g.gameStatus === "not_started",
    ).length;

    return {
      totalUsers: profiles.length,
      // DISTINCT players, not rows: the record is kept per variant, so someone
      // who has played two variants has two rows (/docs/ranking-system.md §12).
      playersPlayed: new Set(stats.map((s) => s.playerId)).size,
      newThisWeek,
      banned,
      subscribers,
      finishedGames: gameLogs.length,
      activeGames,
      waitingGames,
    };
  },
});

/**
 * Leaderboard of top players. Requires GAME_VIEW_ALL.
 * winRate = wins / (wins + losses) — noContests excluded, per playerStats docs.
 */
export const topPlayers = query({
  args: {
    sortBy: v.union(
      v.literal("wins"),
      v.literal("winRate"),
      v.literal("matches"),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sortBy, limit }) => {
    await requirePermission(ctx, PERMISSIONS.GAME_VIEW_ALL);
    const take = limit ?? 10;

    const stats = await ctx.db.query("playerStats").collect();

    // The record is kept per variant, so fold a player's rows together before
    // ranking — otherwise the same person appears once per variant they have
    // played (/docs/ranking-system.md §12). This board stays cross-variant; a
    // per-variant admin board would take a `gameType` filter instead.
    const byPlayer = new Map<Id<"profiles">, Doc<"playerStats">[]>();
    for (const row of stats) {
      const existing = byPlayer.get(row.playerId);
      if (existing) existing.push(row);
      else byPlayer.set(row.playerId, [row]);
    }

    const rows = await Promise.all(
      [...byPlayer].map(async ([playerId, playerRows]) => {
        const s = mergePlayerStats(playerRows);
        const decided = s.wins + s.losses;
        const profile = await ctx.db.get(playerId);
        return {
          playerId,
          nickname: profile?.nickname ?? "Unknown",
          avatar: profile?.avatar ?? null,
          totalMatches: s.totalMatches,
          wins: s.wins,
          losses: s.losses,
          // Win rate as a 0–100 percentage; 0 when the player has no decided games.
          winRate: decided > 0 ? Math.round((s.wins / decided) * 100) : 0,
          decided,
        };
      }),
    );

    const sorted = rows.sort((a, b) => {
      if (sortBy === "wins") return b.wins - a.wins || b.winRate - a.winRate;
      if (sortBy === "matches")
        return b.totalMatches - a.totalMatches || b.wins - a.wins;
      // winRate: rank by rate, but require ≥3 decided games so a single 1-0
      // player doesn't top a seasoned 80% one; ties broken by volume.
      const qualA = a.decided >= 3 ? 1 : 0;
      const qualB = b.decided >= 3 ? 1 : 0;
      return (
        qualB - qualA ||
        b.winRate - a.winRate ||
        b.totalMatches - a.totalMatches
      );
    });

    return sorted.slice(0, take);
  },
});

/** Aggregate game-level analytics from the permanent gameLogs. */
export const gameAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.GAME_VIEW_ALL);
    const now = Date.now();

    const logs = await ctx.db.query("gameLogs").collect();

    // Average duration over games with a valid span.
    let durationSum = 0;
    let durationCount = 0;

    const factionWins: Record<Faction, number> = {
      mafia: 0,
      yakuza: 0,
      citizens: 0,
      serial_killer: 0,
    };
    let noWinner = 0;

    const byType: Record<string, number> = {};
    const winMethods: Record<string, number> = {};

    // Last-30-day daily buckets (index 0 = today, 29 = 29 days ago).
    const today = Math.floor(now / DAY_MS);
    const daily = Array.from({ length: 30 }, (_, i) => ({
      // ms epoch at the start of that day-bucket, for the chart axis.
      day: (today - (29 - i)) * DAY_MS,
      count: 0,
    }));

    for (const log of logs) {
      if (log.finishedAt > log.startedAt) {
        durationSum += log.finishedAt - log.startedAt;
        durationCount += 1;
      }

      if (log.winner) factionWins[log.winner] += 1;
      else noWinner += 1;

      byType[log.gameType] = (byType[log.gameType] ?? 0) + 1;

      if (log.winMethod) {
        const label = winMethodLabel(log.winMethod);
        winMethods[label] = (winMethods[label] ?? 0) + 1;
      }

      const bucket = 29 - (today - Math.floor(log.finishedAt / DAY_MS));
      if (bucket >= 0 && bucket < 30) daily[bucket].count += 1;
    }

    return {
      totalGames: logs.length,
      avgDurationMs: durationCount > 0 ? durationSum / durationCount : 0,
      factionWins,
      noWinner,
      byType: Object.entries(byType).map(([gameType, count]) => ({
        gameType,
        count,
      })),
      winMethods: Object.entries(winMethods)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      gamesPerDay: daily,
    };
  },
});

/** Per-role popularity & win rate, aggregated across every player's stats. */
export const roleAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.GAME_VIEW_ALL);

    const stats = await ctx.db.query("playerStats").collect();

    const byRole: Record<
      string,
      { matches: number; wins: number; losses: number }
    > = {};

    for (const s of stats) {
      for (const r of s.roleStats) {
        const agg = (byRole[r.role] ??= { matches: 0, wins: 0, losses: 0 });
        agg.matches += r.matches;
        agg.wins += r.wins;
        agg.losses += r.losses;
      }
    }

    return Object.entries(byRole)
      .map(([role, a]) => {
        const decided = a.wins + a.losses;
        return {
          role,
          matches: a.matches,
          wins: a.wins,
          losses: a.losses,
          winRate: decided > 0 ? Math.round((a.wins / decided) * 100) : 0,
        };
      })
      .sort((a, b) => b.matches - a.matches);
  },
});

/** Recent finished games + recent privileged admin actions. Requires USER_VIEW. */
export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requirePermission(ctx, PERMISSIONS.USER_VIEW);
    const take = limit ?? 8;

    const [logs, audit] = await Promise.all([
      ctx.db.query("gameLogs").order("desc").take(take),
      ctx.db.query("adminAuditLog").order("desc").take(take),
    ]);

    const recentGames = logs.map((log) => ({
      _id: log._id,
      gameName: log.gameName,
      gameType: log.gameType,
      winner: log.winner,
      winMethodLabel: log.winMethod ? winMethodLabel(log.winMethod) : null,
      finishedAt: log.finishedAt,
    }));

    const recentActions = await Promise.all(
      audit.map(async (entry) => {
        const actor = await ctx.db.get(entry.actorProfileId);
        return {
          _id: entry._id,
          action: entry.action,
          actorNickname: actor?.nickname ?? "Unknown",
          createdAt: entry.createdAt,
        };
      }),
    );

    return { recentGames, recentActions };
  },
});
