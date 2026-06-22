import { defineSchema } from "convex/server";
import {
  profiles,
  games,
  gamePlayers,
  gameSpectators,
  joinRequests,
  gameSessions,
  gamePlayerRoles,
  nightPhaseSessions,
  votingSessions,
  votes,
  cardPickingSessions,
  gameLogs,
  gameLogPlayers,
  playerStats,
  adminAuditLog,
  communityMessages,
} from "./tables";

const schema = defineSchema({
  profiles,
  games,
  gamePlayers,
  gameSpectators,
  joinRequests,
  gameSessions,
  gamePlayerRoles,
  nightPhaseSessions,
  votingSessions,
  votes,
  cardPickingSessions,
  gameLogs,
  gameLogPlayers,
  playerStats,
  adminAuditLog,
  communityMessages,
});

export default schema;
