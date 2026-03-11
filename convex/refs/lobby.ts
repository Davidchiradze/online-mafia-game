import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

type GameType = "traditional" | "city_mafia" | "japanese_mafia";
type GameStatus = "not_started" | "playing" | "finished";

type GamePlayer = {
  _id: Id<"gamePlayers">;
  _creationTime: number;
  gameId: Id<"games">;
  playerId: Id<"users">;
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
  userId: Id<"users">;
  nickname: string;
};

type GameWithRelations = {
  _id: Id<"games">;
  _creationTime: number;
  code: string;
  name: string;
  hostId: Id<"users">;
  gameType: GameType;
  gameStatus: GameStatus;
  maxPlayers: number;
  players: GamePlayer[];
  spectators: GameSpectator[];
};

type Profile = {
  _id: Id<"profiles">;
  _creationTime: number;
  userId: Id<"users">;
  email: string;
  nickname: string;
} | null;

export const authProfiles = {
  currentProfile: makeFunctionReference<"query", Record<string, never>, Profile>(
    "auth/profiles:currentProfile",
  ),
};

type JoinRequestStatus = "pending" | "accepted" | "rejected";

type JoinRequestDoc = {
  _id: Id<"joinRequests">;
  _creationTime: number;
  gameId: Id<"games">;
  requesterId: Id<"users">;
  requesterNickname: string;
  status: JoinRequestStatus;
};

export const joinRequests = {
  listByGame: makeFunctionReference<"query", { gameId: Id<"games"> }, JoinRequestDoc[]>(
    "lobby/joinRequests:listByGame",
  ),
  accept: makeFunctionReference<"mutation", { requestId: Id<"joinRequests"> }, null>(
    "lobby/joinRequests:accept",
  ),
  reject: makeFunctionReference<"mutation", { requestId: Id<"joinRequests"> }, null>(
    "lobby/joinRequests:reject",
  ),
};

export const lobbyGames = {
  list: makeFunctionReference<"query", Record<string, never>, GameWithRelations[]>(
    "lobby/games:list",
  ),
  getById: makeFunctionReference<"query", { gameId: Id<"games"> }, GameWithRelations>(
    "lobby/games:getById",
  ),
  create: makeFunctionReference<
    "mutation",
    { name: string; gameType: GameType },
    Id<"games">
  >("lobby/games:create"),
  remove: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "lobby/games:remove",
  ),
};
