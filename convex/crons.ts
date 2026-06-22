import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily retention prune for the community chat channel (keeps the most recent
// COMMUNITY_CHAT.RETENTION_LIMIT messages). See convex/community/maintenance.ts.
crons.daily(
  "prune community chat",
  { hourUTC: 4, minuteUTC: 0 },
  internal.community.maintenance.pruneOldMessages,
);

export default crons;
