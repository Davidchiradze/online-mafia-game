import { makeFunctionReference } from "convex/server";
import type { PaginationOptions, PaginationResult } from "convex/server";
import type { Id } from "../_generated/dataModel";

type Faction = "mafia" | "yakuza" | "citizens" | "serial_killer";
type Outcome = "win" | "loss" | "no_contest";
type GameType = "sports_mafia" | "city_mafia" | "japanese_mafia";

export type WinMethod = {
  faction: Faction;
  aliveTotal: number;
  mafiaAlive: number;
  yakuzaAlive: boolean;
  shogunAlive: boolean;
  decidedRole?: string;
};

/** One row in the paginated match-history list (self-contained card data). */
export type GameLogRow = {
  _id: Id<"gameLogPlayers">;
  _creationTime: number;
  gameLogId: Id<"gameLogs">;
  gameId: Id<"games">;
  playerId: Id<"profiles">;
  nickname: string;
  role: string;
  seatNumber?: number;
  isAlive: boolean;
  startedAt: number;
  finishedAt: number;
  faction: Faction;
  outcome: Outcome;
  winner: Faction | null;
  gameType: GameType;
  gameName: string;
  winMethod?: WinMethod;
  winMethodLabel: string | null;
  ratingDelta?: number;
  ratingAfter?: number;
  tableAvgRating?: number;
};

/** A player inside a full game-log roster. */
export type GameLogRosterPlayer = {
  playerId: Id<"profiles">;
  nickname: string;
  seatNumber?: number;
  role: string;
  isAlive: boolean;
  avatar?: string; // current profile photo, joined at read time (not snapshotted)
};

/** Full detail of a single finished game (loaded lazily on row expand). */
export type GameLogDetail = {
  _id: Id<"gameLogs">;
  _creationTime: number;
  gameId: Id<"games">;
  gameCode: string;
  gameName: string;
  gameType: GameType;
  hostId: Id<"profiles">;
  hostNickname: string;
  startedAt: number;
  finishedAt: number;
  winner: Faction | null;
  winMethod?: WinMethod;
  players: GameLogRosterPlayer[];
  winMethodLabel: string | null;
} | null;

export type RoleStat = {
  role: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type PlayerStats = {
  totalMatches: number;
  wins: number;
  losses: number;
  noContests: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  rating: number;
  peakRating: number;
  roleStats: RoleStat[];
};

export const gameLogs = {
  listMine: makeFunctionReference<
    "query",
    {
      paginationOpts: PaginationOptions;
      outcome: "all" | Outcome;
      gameType?: GameType;
    },
    PaginationResult<GameLogRow>
  >("games/core/gameLogs:listMyGameLogs"),
  getOne: makeFunctionReference<
    "query",
    { gameLogId: Id<"gameLogs"> },
    GameLogDetail
  >("games/core/gameLogs:getGameLog"),
  myStats: makeFunctionReference<"query", { gameType: GameType }, PlayerStats>(
    "games/core/gameLogs:getMyStats",
  ),
};
