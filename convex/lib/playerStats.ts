import type { DatabaseReader, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Data-access + aggregation helpers for the `playerStats` table, mirroring the
 * split in `lib/playerRatings.ts`: read helpers first, then the write path that
 * keeps `archiveGameLog` free of aggregation mechanics.
 *
 * A player's record is being namespaced per game variant, one row per
 * (player, gameType) (/docs/ranking-system.md §12). Two consequences shape
 * everything here:
 *
 *   1. NOTHING may assume a player has at most one row. `.unique()` throws on
 *      the second, and one of the callers is inside `archiveGameLog` — a throw
 *      there rolls back the whole archive write. Every read collects.
 *   2. Cross-variant readers stay cross-variant. The public API's `gamesPlayed`
 *      is global by contract (/docs/public-api.md §3), so it sums the rows
 *      rather than picking one.
 *
 * Summing is exact for the additive counters: a sum of the per-variant parts is
 * the same number the old single global row held.
 */

type RoleStat = { role: string; matches: number; wins: number; losses: number };

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Every row a player has, across all variants. Empty until their first game. */
export function getAllPlayerStats(
  db: DatabaseReader,
  playerId: Id<"profiles">,
): Promise<Doc<"playerStats">[]> {
  return db
    .query("playerStats")
    .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
    .collect();
}

/** The cross-variant view of a player's record. */
export type PlayerStatsTotals = {
  totalMatches: number;
  wins: number;
  losses: number;
  noContests: number;
  currentStreak: number;
  bestStreak: number;
  roleStats: RoleStat[];
};

const ZERO_TOTALS: PlayerStatsTotals = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  noContests: 0,
  currentStreak: 0,
  bestStreak: 0,
  roleStats: [],
};

/**
 * Fold a player's rows into one cross-variant view. For a single row this is
 * that row verbatim, which is what makes replacing the old `.unique()` reads a
 * no-op on today's data.
 *
 * Counters sum. Roles merge by name — worth knowing that CITIZEN in one variant
 * and CITIZEN in another become one entry here; that is the cost of a global
 * view and the reason per-variant readers stop using it (§12).
 *
 * Streaks do NOT sum, and neither number is really meaningful across variants:
 * `bestStreak` is the best of them, and `currentStreak` is reported the same
 * way for want of anything truer. Per-variant readers take the real value off
 * the row instead.
 */
export function mergePlayerStats(
  rows: Doc<"playerStats">[],
): PlayerStatsTotals {
  if (rows.length === 0) return { ...ZERO_TOTALS, roleStats: [] };

  const roleMap = new Map<string, RoleStat>();
  const totals: PlayerStatsTotals = { ...ZERO_TOTALS, roleStats: [] };

  for (const row of rows) {
    totals.totalMatches += row.totalMatches;
    totals.wins += row.wins;
    totals.losses += row.losses;
    totals.noContests += row.noContests;
    totals.currentStreak = Math.max(totals.currentStreak, row.currentStreak ?? 0);
    totals.bestStreak = Math.max(totals.bestStreak, row.bestStreak ?? 0);

    for (const r of row.roleStats) {
      const entry = roleMap.get(r.role) ?? {
        role: r.role,
        matches: 0,
        wins: 0,
        losses: 0,
      };
      entry.matches += r.matches;
      entry.wins += r.wins;
      entry.losses += r.losses;
      roleMap.set(r.role, entry);
    }
  }

  totals.roleStats = [...roleMap.values()];
  return totals;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Incrementally fold one finished-game result into a player's aggregate stats.
 * Creates the row on first game; otherwise increments the overall counters and
 * the per-role entry. Win rates are derived on read, not stored.
 */
export async function bumpPlayerStats(
  ctx: MutationCtx,
  playerId: Id<"profiles">,
  role: string,
  outcome: "win" | "loss" | "no_contest",
) {
  const rows = await getAllPlayerStats(ctx.db, playerId);
  const existing = rows[0] ?? null;

  const w = outcome === "win" ? 1 : 0;
  const l = outcome === "loss" ? 1 : 0;
  const nc = outcome === "no_contest" ? 1 : 0;

  if (!existing) {
    await ctx.db.insert("playerStats", {
      playerId,
      totalMatches: 1,
      wins: w,
      losses: l,
      noContests: nc,
      currentStreak: w,
      bestStreak: w,
      roleStats: [{ role, matches: 1, wins: w, losses: l }],
    });
    return;
  }

  // Win → extend streak, loss → reset, no-contest → leave unchanged.
  const prevStreak = existing.currentStreak ?? 0;
  const currentStreak =
    outcome === "win" ? prevStreak + 1 : outcome === "loss" ? 0 : prevStreak;
  const bestStreak = Math.max(existing.bestStreak ?? 0, currentStreak);

  const roleStats = [...existing.roleStats];
  const idx = roleStats.findIndex((r) => r.role === role);
  if (idx === -1) {
    roleStats.push({ role, matches: 1, wins: w, losses: l });
  } else {
    const cur = roleStats[idx];
    roleStats[idx] = {
      role,
      matches: cur.matches + 1,
      wins: cur.wins + w,
      losses: cur.losses + l,
    };
  }

  await ctx.db.patch(existing._id, {
    totalMatches: existing.totalMatches + 1,
    wins: existing.wins + w,
    losses: existing.losses + l,
    noContests: existing.noContests + nc,
    currentStreak,
    bestStreak,
    roleStats,
  });
}

/**
 * Rebuild a player's `playerStats` row from scratch off their full
 * `gameLogPlayers` history. Pure re-aggregation of the same counters and streak
 * rules `bumpPlayerStats` maintains incrementally, so the result is identical to
 * what incremental updates would have produced for the (now-updated) history.
 * Used by `annulGameLog` after a game's rows are flipped to no-contest.
 */
export async function recomputePlayerStats(
  ctx: MutationCtx,
  playerId: Id<"profiles">,
) {
  const rows = await ctx.db
    .query("gameLogPlayers")
    .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
    .collect();
  // Chronological order so the streak walk matches how it was built live.
  rows.sort((a, b) => a.finishedAt - b.finishedAt);

  let wins = 0;
  let losses = 0;
  let noContests = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const roleMap = new Map<string, RoleStat>();

  for (const r of rows) {
    const entry = roleMap.get(r.role) ?? {
      role: r.role,
      matches: 0,
      wins: 0,
      losses: 0,
    };
    entry.matches += 1;

    if (r.outcome === "win") {
      wins += 1;
      entry.wins += 1;
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else if (r.outcome === "loss") {
      losses += 1;
      entry.losses += 1;
      currentStreak = 0; // a loss resets the streak
    } else {
      noContests += 1; // no-contest leaves the streak unchanged
    }

    roleMap.set(r.role, entry);
  }

  const existing = (await getAllPlayerStats(ctx.db, playerId))[0] ?? null;

  const fields = {
    totalMatches: rows.length,
    wins,
    losses,
    noContests,
    currentStreak,
    bestStreak,
    roleStats: [...roleMap.values()],
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
  } else {
    await ctx.db.insert("playerStats", { playerId, ...fields });
  }
}
