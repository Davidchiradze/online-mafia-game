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
  // TEMPORARILY OPTIONAL — revert to `gameType,` immediately after
  // migrations:splitPlayerStatsByGameType has been applied on this deployment.
  //
  // It has to be loose for exactly one deploy: the required validator rejects
  // every pre-split row, and the migration that stamps those rows ships in the
  // same push. Loosening lets the code land so the migration can run at all.
  //
  // REQUIRED is the real state. A row with no game type is a pre-split
  // leftover, and that validator is what makes such a row impossible rather
  // than merely unexpected — Convex rejects the deploy if one still exists.
  gameType: v.optional(gameType),
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
