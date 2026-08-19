import { makeFunctionReference } from "convex/server";
import type { PaginationOptions, PaginationResult } from "convex/server";
import type { Id } from "../_generated/dataModel";

/**
 * Function-reference wrappers for the paginated admin queries. Mirrors
 * refs/history.ts — keeps `usePaginatedQuery` calls free of the deep type
 * instantiation (TS2589) that the generated `api` object can trigger.
 */

type AccessRole = "user" | "moderator" | "admin";
type GameType =
  | "sports_mafia"
  | "city_mafia"
  | "japanese_mafia"
  | "serial_killer_mafia";
type Faction = "mafia" | "yakuza" | "citizens" | "serial_killer";

export type AdminUserRow = {
  _id: Id<"profiles">;
  accountId: string;
  nickname: string;
  email?: string;
  avatar?: string;
  role: AccessRole;
  bannedAt: number | null;
  banReason: string | null;
  subscription: {
    packageId: number;
    from?: string;
    to?: string;
    active: boolean;
  } | null;
  createdAt: number;
};

export type AdminWinMethod = {
  faction: Faction;
  aliveTotal: number;
  mafiaAlive: number;
  yakuzaAlive: boolean;
  shogunAlive: boolean;
  decidedRole?: string;
};

export type AdminGameLogRosterPlayer = {
  playerId: Id<"profiles">;
  nickname: string;
  seatNumber?: number;
  role: string;
  isAlive: boolean;
};

export type AdminGameLogRow = {
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
  winMethod?: AdminWinMethod;
  players: AdminGameLogRosterPlayer[];
  winMethodLabel: string | null;
};

export const adminUsers = {
  list: makeFunctionReference<
    "query",
    {
      paginationOpts: PaginationOptions;
      search?: string;
      filter?: "admins" | "moderators" | "subscribers" | "banned";
    },
    PaginationResult<AdminUserRow>
  >("admin/users:listUsers"),
};

export const adminGameLogs = {
  listAll: makeFunctionReference<
    "query",
    { paginationOpts: PaginationOptions; gameType?: GameType; search?: string },
    PaginationResult<AdminGameLogRow>
  >("admin/gameLogs:listAllGameLogs"),
};
