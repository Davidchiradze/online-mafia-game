import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
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
} from "./tables";

const schema = defineSchema({
  ...authTables,
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
});

export default schema;
