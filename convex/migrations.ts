import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { BACKFILL_POLICY, RATING_CONFIG } from "./lib/constants";
import { computeRatingDelta } from "./lib/ratings";
import { gameType } from "./tables/games";
import type { Doc } from "./_generated/dataModel";

/**
 * One-time migration: clear legacy `profiles.role` values so the field can be
 * tightened from `v.optional(v.string())` to the typed union
 * (`accessRoleValidator`, user/moderator/admin).
 *
 * `profiles.role` is now Convex-owned and written only through
 * `accessRoleValidator`-validated mutation args, but historical rows may still
 * hold stale free-form strings (e.g. an old PHP-synced value). Absence of
 * `role` is treated as the default ("user") in code, so clearing is safe.
 *
 * Run order to tighten the schema:
 *   1. Deploy with `profiles.role` still `v.optional(v.string())` (current).
 *   2. `npx convex run migrations:clearLegacyRoles`
 *   3. Switch `profiles.role` to `accessRoleValidator` and deploy.
 *
 * Idempotent — safe to run multiple times.
 */
export const clearLegacyRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const VALID = new Set(["user", "moderator", "admin"]);
    const profiles = await ctx.db.query("profiles").collect();
    let cleared = 0;
    for (const profile of profiles) {
      if (profile.role !== undefined && !VALID.has(profile.role)) {
        await ctx.db.patch(profile._id, { role: undefined });
        cleared++;
      }
    }
    return { total: profiles.length, cleared };
  },
});

/**
 * One-time migration: drop the legacy `profiles.username` field. The column was
 * merged into `nickname` (now synced from PHP `username` on every profile sync),
 * so the separate stored value is dead. Existing rows must be cleared before the
 * field is removed from the schema, or schema validation rejects them on read.
 *
 * Run order:
 *   1. Deploy code that no longer writes `username` (current).
 *   2. `npx convex run migrations:clearLegacyUsername`
 *
 * Idempotent — safe to run multiple times.
 */
export const clearLegacyUsername = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    let cleared = 0;
    for (const profile of profiles) {
      if ((profile as { username?: string }).username !== undefined) {
        await ctx.db.patch(profile._id, {
          username: undefined,
        } as Partial<typeof profile>);
        cleared++;
      }
    }
    return { total: profiles.length, cleared };
  },
});

/**
 * ELO backfill: replay every archived rated game in global chronological
 * order and rebuild all rating state (see /docs/ranking-system.md §8).
 *
 * Deterministic recompute-from-scratch: wipes `playerRatings` for rated game
 * types and overwrites `ratingDelta` / `ratingAfter` / `tableAvgRating` on
 * every rated `gameLogPlayers` row. Because the ordering (finishedAt, then
 * _creationTime) and the formula are deterministic, re-runs are idempotent by
 * construction, and it is safe to run AFTER the live rating code deploys —
 * any live-written deltas are re-derived identically.
 *
 * Order matters: each game's table average depends on everyone's rating at
 * that moment, so games are replayed strictly by `finishedAt` — a per-player
 * walk would be wrong.
 *
 * Race caveat: a game that archives while this runs keeps deltas based on
 * pre-rebuild ratings; simply re-run the migration. Prefer a quiet window.
 *
 * Scale: single mutation is fine at current volume (~280 games / ~3.4k player
 * rows ≈ half the 8,192-write budget). Past ~7k rated player rows, convert to
 * an internalAction driving chunked internalMutations.
 *
 * SCOPED AND DRY-RUN BY DEFAULT, because this is a destructive replay that
 * starts by DELETING rating rows. `gameTypes` is required — there is no "all"
 * — so a variant whose archive must stay unrated can never be swept in by a
 * forgotten flag, and `BACKFILL_POLICY` refuses it a second time even if it is
 * named explicitly. Without `apply: true` nothing is written; the returned
 * counts are what a real run WOULD do.
 *
 * Run: `npx convex run migrations:backfillRatings '{"gameTypes":["japanese_mafia"]}'`
 * to preview, then add `"apply":true` (and `--prod` for prod).
 */
export const backfillRatings = internalMutation({
  args: {
    /** Archives to replay. Required, and checked against `BACKFILL_POLICY`. */
    gameTypes: v.array(gameType),
    /** Omitted or false = dry run: compute and report, write nothing. */
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apply = args.apply ?? false;

    // 0. Refuse before touching data. An empty list is a mistake, not a no-op:
    //    silently doing nothing reads as "ran fine" to whoever typed it.
    if (args.gameTypes.length === 0) {
      throw new ConvexError(
        "backfillRatings needs an explicit gameTypes list — e.g. {\"gameTypes\":[\"japanese_mafia\"]}",
      );
    }
    const refused = args.gameTypes.filter(
      (t) => BACKFILL_POLICY[t] !== "replay" || !RATING_CONFIG[t],
    );
    if (refused.length > 0) {
      throw new ConvexError(
        `Refusing to replay: ${refused.join(", ")}. BACKFILL_POLICY says these archives stay as they were played, or the type is unrated (/docs/ranking-system.md §8).`,
      );
    }
    const requested = new Set(args.gameTypes);

    // 1. Wipe current ratings for the requested game types. Ladders not named
    //    are untouched — a scoped replay must not disturb its neighbours.
    const existingRatings = await ctx.db.query("playerRatings").collect();
    let ratingsDeleted = 0;
    for (const r of existingRatings) {
      if (requested.has(r.gameType)) {
        if (apply) await ctx.db.delete(r._id);
        ratingsDeleted++;
      }
    }

    // 2. Load requested games in global chronological order. No finishedAt
    //    index on gameLogs — collect() + in-memory sort is fine at this volume.
    const logs = (await ctx.db.query("gameLogs").collect())
      .filter((l) => requested.has(l.gameType))
      .sort(
        (a, b) =>
          a.finishedAt - b.finishedAt || a._creationTime - b._creationTime,
      );

    // 3. Replay. Rating state lives in memory, keyed per game type so a
    //    second rated variant backfills correctly alongside the first.
    const state = new Map<string, { rating: number; peak: number }>();
    const key = (gameType: string, playerId: string) =>
      `${gameType}:${playerId}`;
    let rowsStamped = 0;

    for (const log of logs) {
      const config = RATING_CONFIG[log.gameType]!;
      const rows = await ctx.db
        .query("gameLogPlayers")
        .withIndex("by_gameLogId", (q) => q.eq("gameLogId", log._id))
        .collect();
      if (rows.length === 0) continue;

      const pre = (row: Doc<"gameLogPlayers">) =>
        state.get(key(log.gameType, row.playerId)) ?? {
          rating: config.start,
          peak: config.start,
        };

      const tableAvg =
        rows.reduce((sum, row) => sum + pre(row).rating, 0) / rows.length;

      for (const row of rows) {
        const { rating, peak } = pre(row);
        const { delta, after } = computeRatingDelta(
          config,
          row.faction,
          row.outcome,
          rating,
          tableAvg,
        );
        if (apply) {
          await ctx.db.patch(row._id, {
            ratingDelta: delta,
            ratingAfter: after,
            tableAvgRating: Math.round(tableAvg),
          });
        }
        // Updated even in a dry run: the replay is order-dependent, so the
        // reported numbers are only faithful if the state advances.
        state.set(key(log.gameType, row.playerId), {
          rating: after,
          peak: Math.max(peak, after),
        });
        rowsStamped++;
      }
    }

    // 4. Write final playerRatings rows.
    let ratingsCreated = 0;
    for (const [k, { rating, peak }] of state) {
      const sep = k.indexOf(":");
      const replayedType = k.slice(0, sep) as Doc<"playerRatings">["gameType"];
      const playerId = k.slice(sep + 1) as Doc<"playerRatings">["playerId"];
      if (apply) {
        await ctx.db.insert("playerRatings", {
          playerId,
          gameType: replayedType,
          rating,
          peakRating: peak,
        });
      }
      ratingsCreated++;
    }

    return {
      mode: apply ? "applied" : "dry-run",
      gameTypes: [...requested],
      ratingsDeleted,
      gamesProcessed: logs.length,
      rowsStamped,
      ratingsCreated,
    };
  },
});
