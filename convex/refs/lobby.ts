import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

type GameType =
  | "sports_mafia"
  | "city_mafia"
  | "japanese_mafia"
  | "serial_killer_mafia";
type GameStatus = "not_started" | "playing" | "finished";

type GamePlayer = {
  _id: Id<"gamePlayers">;
  _creationTime: number;
  gameId: Id<"games">;
  playerId: Id<"profiles">;
  nickname: string;
  seatNumber?: number;
  isAlive: boolean;
  fouls: number;
  foulSpeakStartedAt?: number;
  state?: string;
  avatar?: string;
};

type GameSpectator = {
  _id: Id<"gameSpectators">;
  _creationTime: number;
  gameId: Id<"games">;
  userId: Id<"profiles">;
  nickname: string;
  avatar?: string;
};

type GameWithRelations = {
  _id: Id<"games">;
  _creationTime: number;
  code: string;
  name: string;
  hostId: Id<"profiles">;
  gameType: GameType;
  gameStatus: GameStatus;
  maxPlayers: number;
  isPrivate: boolean;
  players: GamePlayer[];
  spectators: GameSpectator[];
  /** Live table average ELO (non-host roster). Undefined when unrated or only the host has joined. */
  tableAvgRating?: number;
};

/**
 * `lobby/games:list`'s return shape. That query is anonymous-readable (see
 * `GUEST_VIEWABLE_PATHS` in `convex/lib/access.ts`), so its handler projects
 * an explicit field list instead of spreading the game doc — `code` is
 * deliberately excluded. `getById` still returns the full `GameWithRelations`.
 */
export type LobbyGameSummary = Omit<GameWithRelations, "code">;

type Profile = {
  _id: Id<"profiles">;
  _creationTime: number;
  accountId: string;
  email?: string;
  name?: string;
  nickname: string;
  avatar?: string;
  role?: string;
  amount?: string;
  subscription?: {
    packageId: number;
    from?: string;
    to?: string;
    active: boolean;
  };
  verified: boolean;
  createdAt: number;
  updatedAt: number;
} | null;

type UpsertFromPhpArgs = {
  secret: string;
  accountId: string;
  email?: string;
  nickname?: string;
  name?: string;
  avatar?: string;
  role?: string;
  amount?: string;
  verified?: boolean;
  subscription?: {
    packageId: number;
    from?: string;
    to?: string;
    active: boolean;
  };
};

export const authProfiles = {
  currentAccountId: makeFunctionReference<"query", Record<string, never>, string | null>(
    "auth/profiles:currentAccountId",
  ),
  currentProfile: makeFunctionReference<"query", Record<string, never>, Profile>(
    "auth/profiles:currentProfile",
  ),
  upsertFromPhp: makeFunctionReference<"mutation", UpsertFromPhpArgs, Id<"profiles">>(
    "auth/profiles:upsertFromPhp",
  ),
};

type JoinRequestStatus = "pending" | "accepted" | "rejected";

type JoinRequestDoc = {
  _id: Id<"joinRequests">;
  _creationTime: number;
  gameId: Id<"games">;
  requesterId: Id<"profiles">;
  requesterNickname: string;
  requesterAvatar?: string;
  status: JoinRequestStatus;
};

type MyJoinStatus = {
  allowed: boolean;
  status: "accepted" | "pending" | "rejected" | "none";
};

export const joinRequests = {
  myStatus: makeFunctionReference<"query", { gameId: Id<"games"> }, MyJoinStatus>(
    "lobby/joinRequests:myStatus",
  ),
  myActiveRequests: makeFunctionReference<
    "query",
    Record<string, never>,
    {
      requestId: Id<"joinRequests">;
      gameId: Id<"games">;
      gameName: string;
      status: JoinRequestStatus;
    }[]
  >("lobby/joinRequests:myActiveRequests"),
  checkOrRequest: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { allowed: boolean; status: string; requestId?: Id<"joinRequests"> }
  >("lobby/joinRequests:checkOrRequest"),
  countPending: makeFunctionReference<"query", { gameId: Id<"games"> }, number>(
    "lobby/joinRequests:countPending",
  ),
  listPending: makeFunctionReference<"query", { gameId: Id<"games"> }, JoinRequestDoc[]>(
    "lobby/joinRequests:listPending",
  ),
  listByGame: makeFunctionReference<"query", { gameId: Id<"games"> }, JoinRequestDoc[]>(
    "lobby/joinRequests:listByGame",
  ),
  accept: makeFunctionReference<"mutation", { requestId: Id<"joinRequests"> }, null>(
    "lobby/joinRequests:accept",
  ),
  reject: makeFunctionReference<"mutation", { requestId: Id<"joinRequests"> }, null>(
    "lobby/joinRequests:reject",
  ),
  kick: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetUserId: Id<"profiles"> },
    null
  >("lobby/joinRequests:kick"),
};

export const hostTransfer = {
  transfer: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; newHostId: Id<"profiles"> },
    null
  >("lobby/hostTransfer:transfer"),
};

export const lobbyGames = {
  list: makeFunctionReference<"query", Record<string, never>, LobbyGameSummary[]>(
    "lobby/games:list",
  ),
  getById: makeFunctionReference<"query", { gameId: Id<"games"> }, GameWithRelations | null>(
    "lobby/games:getById",
  ),
  create: makeFunctionReference<
    "mutation",
    { name: string; gameType: GameType; isPrivate: boolean; pin?: string },
    Id<"games">
  >("lobby/games:create"),
  update: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; name?: string; isPrivate?: boolean; pin?: string },
    null
  >("lobby/games:update"),
  /** Host-only. The one read path for a private room's access PIN. */
  getPin: makeFunctionReference<"query", { gameId: Id<"games"> }, string | null>(
    "lobby/games:getPin",
  ),
  remove: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "lobby/games:remove",
  ),
};
