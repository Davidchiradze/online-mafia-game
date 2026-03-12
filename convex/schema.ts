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
});

export default schema;
