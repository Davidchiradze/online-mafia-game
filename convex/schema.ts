import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { profiles } from "./tables";

const schema = defineSchema({
  ...authTables,
  profiles,
});

export default schema;
