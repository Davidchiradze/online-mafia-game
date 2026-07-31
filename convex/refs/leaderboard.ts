import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

type GameType = "sports_mafia" | "city_mafia" | "japanese_mafia";

/** One leaderboard entry, pre-sorted by rating desc (see game/leaderboard.ts). */
export type LeaderboardRow = {
  playerId: Id<"profiles">;
  nickname: string;
  avatar: string | null;
  rating: number;
  peakRating: number;
  // Global stats from playerStats (not per-gameType) — v1 caveat, see the query.
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
  currentStreak: number;
  bestStreak: number;
  topRole: { role: string; matches: number; winRate: number } | null;
};

export const leaderboard = {
  list: makeFunctionReference<
    "query",
    { gameType: GameType; limit?: number },
    LeaderboardRow[]
  >("games/core/leaderboard:getLeaderboard"),
};
