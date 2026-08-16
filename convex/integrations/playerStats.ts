/**
 * Player stats for mafia.ge (PHP) — batch lookup by PHP account id.
 *
 * Routed at `POST /api/stats/players` in `convex/http.ts`. This is the only
 * outward-facing backend surface with no typed client and no user session: the
 * caller is a server, authorized by a shared bearer secret, and it addresses
 * players by `profiles.accountId` (the PHP account id) rather than by
 * `Id<"profiles">`, which PHP has no way to know.
 *
 * Reads are O(1) per player. `playerStats` is a rolling aggregate maintained by
 * `bumpPlayerStats` as each game archives (see `convex/lib/playerStats.ts`), so
 * this never touches `gameLogPlayers` and cost does not grow with a player's
 * history — two indexed reads per requested id, that is all.
 *
 * `totalMatches` is deliberately GLOBAL across variants: japanese_mafia and
 * sports_mafia both count toward `gamesPlayed`. That is the agreed meaning of
 * the field on the PHP side; a per-variant breakdown would be a NEW field, not
 * a redefinition of this one — docs/public-api.md §3. Since the record is now
 * kept per variant, holding that promise means SUMMING a player's rows — and
 * reading them with `.unique()` would throw the moment they have two.
 */

import { v } from "convex/values";
import { internalQuery, httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { getProfileByAccountId } from "../lib/profiles";
import { getAllPlayerStats } from "../lib/playerStats";
import {
  errorResponse,
  isAuthorized,
  jsonResponse,
  parseAccountIds,
} from "../lib/publicApi";

/**
 * The per-account payload.
 *
 * GROWTH RULE: this surface is versionless, so it may only ever grow by ADDING
 * keys. A new stat is a new optional field PHP can ignore until it is ready;
 * renaming or repurposing an existing key silently corrupts whatever mafia.ge
 * already renders from it. Both places to touch are right here — the type and
 * `toPayload` — so adding `wins` or `winRate` later is a two-line change.
 */
export type PlayerStatsPayload = {
  /** Archived games across ALL variants, decided or not (incl. no-contests). */
  gamesPlayed: number;
};

/**
 * A player known to us but with no `playerStats` row has genuinely played zero
 * archived games — the row is created lazily on first archive. That is a real
 * zero, not missing data, so it is never reported in `missing`.
 */
const ZERO: PlayerStatsPayload = { gamesPlayed: 0 };

function toPayload(rows: Doc<"playerStats">[]): PlayerStatsPayload {
  // SUM, never pick: a player has one row per variant they have played, and
  // `gamesPlayed` is cross-variant by contract. Summing the parts gives exactly
  // the number the old single global row held.
  return { gamesPlayed: rows.reduce((n, row) => n + row.totalMatches, 0) };
}

/**
 * Batch stats lookup keyed by PHP account id.
 *
 * `stats` carries an entry for EVERY requested id, zero-filled for ids we have
 * never seen, so the caller can index it unconditionally. `missing` names the
 * subset that has no profile at all — an account that never signed in to the
 * online game. Keeping both means PHP gets a simple lookup by default and can
 * still tell "played nothing" apart from "unknown account" when it matters.
 *
 * Internal: reachable only through the secret-gated HTTP action below, never
 * from a browser.
 */
export const byAccountIds = internalQuery({
  args: { accountIds: v.array(v.string()) },
  handler: async (ctx, { accountIds }) => {
    const stats: Record<string, PlayerStatsPayload> = {};
    const missing: string[] = [];

    for (const accountId of accountIds) {
      const profile = await getProfileByAccountId(ctx.db, accountId);
      if (!profile) {
        stats[accountId] = ZERO;
        missing.push(accountId);
        continue;
      }

      stats[accountId] = toPayload(
        await getAllPlayerStats(ctx.db, profile._id),
      );
    }

    return { stats, missing };
  },
});

/**
 * `POST /api/stats/players` — see `convex/http.ts` for the route.
 *
 * Authorization is `Authorization: Bearer $STATS_API_SECRET`, a secret held
 * only by mafia.ge's backend. It is NOT the `CONVEX_SYNC_SECRET` used by
 * `auth/profiles:upsertFromPhp` on purpose: that one can write profiles, and a
 * read-only stats integration should not carry write authority.
 *
 * Every failure returns the same `{ error, message }` envelope so the caller
 * has one branch to write. 401 is returned without distinguishing "no header"
 * from "wrong secret".
 */
export const handleGetPlayerStats = httpAction(async (ctx, request) => {
  if (!isAuthorized(request.headers.get("Authorization"), process.env.STATS_API_SECRET)) {
    return errorResponse("unauthorized", "Invalid or missing bearer token.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_body", "Request body must be valid JSON.", 400);
  }

  const parsed = parseAccountIds(body);
  if (!parsed.ok) {
    // 413 for the size cap, 400 for a malformed body — both are caller errors,
    // but only one is fixed by splitting the request into pages.
    return errorResponse(
      parsed.code,
      parsed.message,
      parsed.code === "too_many_accounts" ? 413 : 400,
    );
  }

  const result = await ctx.runQuery(internal.integrations.playerStats.byAccountIds, {
    accountIds: parsed.accountIds,
  });

  return jsonResponse(result);
});
