import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameType } from "./games";

/**
 * Per-player aggregate statistics, maintained incrementally inside
 * `archiveGameLog` when each game finishes. Reads are O(1) regardless of how
 * many games a player has — win rates are derived on read, not stored.
 *
 * `noContests` are tracked but excluded from win-rate denominators:
 * winRate = wins / (wins + losses).
 *
 * One row per player per game variant, mirroring `playerRatings` — each variant
 * is its own record, so a Sports win never shows up in a Japanese win rate
 * (/docs/ranking-system.md §12).
 */
export const playerStats = defineTable({
  playerId: v.id("profiles"),
  // REQUIRED since migrations:splitPlayerStatsByGameType ran. A row with no
  // game type is a pre-split leftover, and this validator is what makes such a
  // row impossible rather than merely unexpected — Convex rejects the deploy if
  // one still exists.
  //
  // Tightening this is a TWO-DEPLOY dance on any deployment that still holds
  // pre-split rows: the validator rejects them, and the migration that fixes
  // them ships in the same push. Loosen to `v.optional(gameType)`, deploy, run
  // the migration, restore this line, deploy again.
  gameType,
  totalMatches: v.number(),
  wins: v.number(),
  losses: v.number(),
  noContests: v.number(),
  // Consecutive-win streak: incremented on a win, reset to 0 on a loss, left
  // unchanged on a no-contest. Optional so rows created before this field
  // validate; treated as 0 on read.
  currentStreak: v.optional(v.number()),
  bestStreak: v.optional(v.number()),
  // One entry per role the player has held. noContests = matches - wins - losses.
  roleStats: v.array(
    v.object({
      role: v.string(),
      matches: v.number(),
      wins: v.number(),
      losses: v.number(),
    }),
  ),
})
  // Kept permanently, not transitional: the public API's `gamesPlayed` is
  // cross-variant by contract (/docs/public-api.md §3), so that reader needs
  // ALL of a player's rows, not one variant's.
  .index("by_playerId", ["playerId"])
  // The per-variant record: one row per (player, variant).
  .index("by_playerId_gameType", ["playerId", "gameType"]);
