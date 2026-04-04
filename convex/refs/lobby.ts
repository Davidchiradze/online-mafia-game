import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

type GameType = "traditional" | "city_mafia" | "japanese_mafia";
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
};

type GameSpectator = {
  _id: Id<"gameSpectators">;
  _creationTime: number;
  gameId: Id<"games">;
  userId: Id<"profiles">;
  nickname: string;
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
};

type Profile = {
  _id: Id<"profiles">;
  _creationTime: number;
  userId: Id<"users">;
  email: string;
  nickname: string;
  verified: boolean;
} | null;

export const authProfiles = {
  currentUserId: makeFunctionReference<"query", Record<string, never>, Id<"users"> | null>(
    "auth/profiles:currentUserId",
  ),
  currentProfile: makeFunctionReference<"query", Record<string, never>, Profile>(
    "auth/profiles:currentProfile",
  ),
};

type JoinRequestStatus = "pending" | "accepted" | "rejected";

type JoinRequestDoc = {
  _id: Id<"joinRequests">;
  _creationTime: number;
  gameId: Id<"games">;
  requesterId: Id<"profiles">;
  requesterNickname: string;
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
  checkOrRequest: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { allowed: boolean; status: string; requestId?: Id<"joinRequests"> }
  >("lobby/joinRequests:checkOrRequest"),
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
  list: makeFunctionReference<"query", Record<string, never>, GameWithRelations[]>(
    "lobby/games:list",
  ),
  getById: makeFunctionReference<"query", { gameId: Id<"games"> }, GameWithRelations | null>(
    "lobby/games:getById",
  ),
  create: makeFunctionReference<
    "mutation",
    { name: string; gameType: GameType; isPrivate: boolean },
    Id<"games">
  >("lobby/games:create"),
  remove: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "lobby/games:remove",
  ),
};
