import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Per-player aggregate statistics, maintained incrementally inside
 * `archiveGameLog` when each game finishes. Reads are O(1) regardless of how
 * many games a player has — win rates are derived on read, not stored.
 *
 * `noContests` are tracked but excluded from win-rate denominators:
 * winRate = wins / (wins + losses).
 */
export const playerStats = defineTable({
  playerId: v.id("profiles"),
  totalMatches: v.number(),
  wins: v.number(),
  losses: v.number(),
  noContests: v.number(),
  // One entry per role the player has held. noContests = matches - wins - losses.
  roleStats: v.array(
    v.object({
      role: v.string(),
      matches: v.number(),
      wins: v.number(),
      losses: v.number(),
    }),
  ),
}).index("by_playerId", ["playerId"]);
