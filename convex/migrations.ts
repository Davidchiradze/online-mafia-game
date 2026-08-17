import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { BACKFILL_POLICY, RATING_CONFIG } from "./lib/constants";
import { computeRatingDelta } from "./lib/ratings";
import { aggregateHistory } from "./lib/playerStats";
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
 * Split `playerStats` into one row per (player, game variant) —
 * /docs/ranking-system.md §12.
 *
 * REBUILDS FROM `gameLogPlayers` rather than patching rows in place, for the
 * reason the split exists at all: one global row holds two variants' games
 * mixed together, and nothing can separate them except the archive they came
 * from. Stamping a game type onto the existing row would just relabel the mix.
 *
 * It also reuses `aggregateHistory`, the same function the live annul path
 * uses, so a rebuilt row cannot disagree with an incrementally maintained one.
 * Idempotent by construction: the output is a pure function of the archive, so
 * a re-run converges and any pre-existing skew is corrected rather than kept.
 *
 * Run order (/docs/ranking-system.md §12):
 *   1. Deploy this + the per-variant write path.
 *   2. `npx convex run migrations:splitPlayerStatsByGameType` — DRY RUN. Read
 *      `playersWithMultipleVariants` and `byGameType` before going further:
 *      that is the check on "every existing row is really Japanese history".
 *   3. Re-run with `'{"apply":true}'`.
 *   4. Only then tighten `playerStats.gameType` to required and deploy.
 *
 * Scale: reads all of `gameLogPlayers` (~3.4k docs) and writes ~one row per
 * player-variant pair — a few hundred, well inside the 8,192-write budget. The
 * binding limit is the read side (~16k docs scanned); past that, chunk by
 * player-id range, which is safe here because the aggregation is per-player and
 * order-independent ACROSS players (unlike `backfillRatings`).
 */
export const splitPlayerStatsByGameType = internalMutation({
  args: {
    /** Omitted or false = dry run: compute and report, write nothing. */
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apply = args.apply ?? false;

    const history = await ctx.db.query("gameLogPlayers").collect();
    const existing = await ctx.db.query("playerStats").collect();

    // 1. Target state: one entry per (player, variant) that has any history.
    const byKey = new Map<string, Doc<"gameLogPlayers">[]>();
    for (const row of history) {
      const key = `${row.playerId}:${row.gameType}`;
      const group = byKey.get(key);
      if (group) group.push(row);
      else byKey.set(key, [row]);
    }

    const targets = new Map<
      string,
      {
        playerId: Doc<"gameLogPlayers">["playerId"];
        gameType: Doc<"gameLogPlayers">["gameType"];
        fields: ReturnType<typeof aggregateHistory>;
      }
    >();
    for (const [key, group] of byKey) {
      targets.set(key, {
        playerId: group[0].playerId,
        gameType: group[0].gameType,
        fields: aggregateHistory(group),
      });
    }

    // 2. Reconcile against what is stored — never blind-insert, so a re-run
    //    converges instead of duplicating.
    let legacyRemoved = 0;
    let patched = 0;
    let inserted = 0;
    let orphansRemoved = 0;
    const seen = new Set<string>();

    for (const row of existing) {
      // Pre-split row: it has no game type, and its counters live on in the
      // per-variant rows rebuilt below.
      if (!row.gameType) {
        if (apply) await ctx.db.delete(row._id);
        legacyRemoved++;
        continue;
      }
      const key = `${row.playerId}:${row.gameType}`;
      // A row for a variant with no history left (all games annulled away, or a
      // duplicate) has nothing to hold.
      if (!targets.has(key) || seen.has(key)) {
        if (apply) await ctx.db.delete(row._id);
        orphansRemoved++;
        continue;
      }
      seen.add(key);
      if (apply) await ctx.db.patch(row._id, targets.get(key)!.fields);
      patched++;
    }

    for (const [key, target] of targets) {
      if (seen.has(key)) continue;
      if (apply) {
        await ctx.db.insert("playerStats", {
          playerId: target.playerId,
          gameType: target.gameType,
          ...target.fields,
        });
      }
      inserted++;
    }

    // 3. The numbers worth reading before applying.
    const variantsPerPlayer = new Map<string, Set<string>>();
    const byGameType: Record<string, number> = {};
    for (const target of targets.values()) {
      const set = variantsPerPlayer.get(target.playerId) ?? new Set<string>();
      set.add(target.gameType);
      variantsPerPlayer.set(target.playerId, set);
      byGameType[target.gameType] = (byGameType[target.gameType] ?? 0) + 1;
    }

    return {
      mode: apply ? "applied" : "dry-run",
      legacyRemoved,
      patched,
      inserted,
      orphansRemoved,
      playersTouched: variantsPerPlayer.size,
      playersWithMultipleVariants: [...variantsPerPlayer.values()].filter(
        (s) => s.size > 1,
      ).length,
      byGameType,
    };
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

/**
 * One-time migration: rewrite the retired `MAFIA_RIGHT_HAND` role out of the
 * archive, folding it into plain `MAFIA`.
 *
 * The role was reachable only by in-game promotion during a
 * `don_chooses_right_hand` phase. Both are gone, so no live game can produce it
 * — but finished games persist it in four places, and this closes all four:
 *
 *   1. `gameLogPlayers.role`          — per-player history rows
 *   2. `gameLogs.players[].role`      — the parent roster snapshot
 *   3. `gameLogs.winMethod.decidedRole` — the headline role of a 1v1 endgame
 *   4. `playerStats.roleStats[]`      — the per-role aggregate
 *
 * `faction` is NOT touched: it is stored, and the Right Hand was always mafia,
 * so every faction, outcome, win-rate and rating figure is unchanged. This is a
 * pure relabel — the only counters that move are the per-role ones, where a
 * player's Right Hand games MERGE into their MAFIA entry.
 *
 * That merge is why (4) is REBUILT rather than patched: a player can hold both
 * a `MAFIA_RIGHT_HAND` and a `MAFIA` entry, and summing them by hand is exactly
 * the kind of arithmetic that drifts from `bumpPlayerStats`. Instead it reuses
 * `aggregateHistory` — the same function the live annul path and the split
 * migration use — over the rewritten history, so a rebuilt row cannot disagree
 * with an incrementally maintained one.
 *
 * Idempotent by construction: the output is a pure function of the archive, so a
 * re-run converges and finds nothing left to do.
 *
 * IRREVERSIBLE. There is no column that remembers a row used to say
 * `MAFIA_RIGHT_HAND` once this has applied.
 *
 * Run order:
 *   1. Deploy the code that no longer produces the role (it already cannot).
 *   2. `npx convex run migrations:mergeRetiredRightHandRole` — DRY RUN. Read
 *      `logPlayerRows`, `statsRowsAffected` and `playersAffected` first; if they
 *      are all 0 this deployment never dealt the role and there is nothing to do.
 *   3. Re-run with `'{"apply":true}'`.
 *
 * Between (1) and (3) archived Right Hand rows render with citizen-coloured
 * decoration, because `roleToFaction` no longer knows the name. Stored
 * `faction` is unaffected, so outcomes and win rates stay correct throughout —
 * it is decoration only, and it ends when this runs.
 */
export const mergeRetiredRightHandRole = internalMutation({
  args: {
    /** Omitted or false = dry run: compute and report, write nothing. */
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apply = args.apply ?? false;
    const RETIRED = "MAFIA_RIGHT_HAND";
    const REPLACEMENT = "MAFIA";

    // --- 1. Per-player history rows ---------------------------------------
    const history = await ctx.db.query("gameLogPlayers").collect();
    const staleLogPlayers = history.filter((r) => r.role === RETIRED);

    for (const row of staleLogPlayers) {
      if (apply) await ctx.db.patch(row._id, { role: REPLACEMENT });
    }

    // --- 2 & 3. Parent roster + endgame headline role ---------------------
    const logs = await ctx.db.query("gameLogs").collect();
    let rostersRewritten = 0;
    let decidedRolesRewritten = 0;

    for (const log of logs) {
      const rosterHit = log.players.some((p) => p.role === RETIRED);
      const decidedHit = log.winMethod?.decidedRole === RETIRED;
      if (!rosterHit && !decidedHit) continue;

      const patch: Partial<typeof log> = {};
      if (rosterHit) {
        patch.players = log.players.map((p) =>
          p.role === RETIRED ? { ...p, role: REPLACEMENT } : p,
        );
        rostersRewritten++;
      }
      if (decidedHit && log.winMethod) {
        patch.winMethod = { ...log.winMethod, decidedRole: REPLACEMENT };
        decidedRolesRewritten++;
      }
      if (apply) await ctx.db.patch(log._id, patch);
    }

    // --- 4. Rebuild the per-role aggregate --------------------------------
    // Scoped to the (player, variant) pairs this migration actually touches,
    // so an unrelated player's row is never rewritten. Aggregating from the
    // PROJECTED history (role already mapped) makes the dry run report exactly
    // what applying would write.
    const affectedPairs = new Map<
      string,
      { playerId: Doc<"gameLogPlayers">["playerId"]; gameType: Doc<"gameLogPlayers">["gameType"] }
    >();
    for (const row of staleLogPlayers) {
      affectedPairs.set(`${row.playerId}:${row.gameType}`, {
        playerId: row.playerId,
        gameType: row.gameType,
      });
    }

    const projected = history.map((r) =>
      r.role === RETIRED ? { ...r, role: REPLACEMENT } : r,
    );

    let statsRowsAffected = 0;
    let statsRowsMissing = 0;
    for (const { playerId, gameType: variant } of affectedPairs.values()) {
      const fields = aggregateHistory(
        projected.filter(
          (r) => r.playerId === playerId && r.gameType === variant,
        ),
      );
      const existing = await ctx.db
        .query("playerStats")
        .withIndex("by_playerId_gameType", (q) =>
          q.eq("playerId", playerId).eq("gameType", variant),
        )
        .unique();

      if (!existing) {
        // History with no stats row is a pre-existing inconsistency, not
        // something this migration created. Report it rather than inventing a
        // row, so the number is visible instead of silently fixed.
        statsRowsMissing++;
        continue;
      }
      if (apply) await ctx.db.patch(existing._id, fields);
      statsRowsAffected++;
    }

    return {
      mode: apply ? "applied" : "dry-run",
      logPlayerRows: staleLogPlayers.length,
      rostersRewritten,
      decidedRolesRewritten,
      statsRowsAffected,
      statsRowsMissing,
      playersAffected: new Set(
        [...affectedPairs.values()].map((p) => p.playerId),
      ).size,
    };
  },
});
