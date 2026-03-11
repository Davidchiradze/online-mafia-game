import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import {
  profiles,
  games,
  gamePlayers,
  gameSpectators,
  joinRequests,
} from "./tables";

const schema = defineSchema({
  ...authTables,
  profiles,
  games,
  gamePlayers,
  gameSpectators,
  joinRequests,
});

export default schema;
