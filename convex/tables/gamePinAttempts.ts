import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Failed PIN attempts per user per private room.
 *
 * A 4-digit PIN is 10k combinations, so `verifyGamePin` throttles on this row:
 * `MAX_PIN_ATTEMPTS` failures inside `PIN_ATTEMPT_WINDOW_MS` lock the user out
 * for the rest of the window. The row is cleared on a correct PIN and
 * cascade-deleted with the game (`GAME_RELATED_TABLES`), which is what the
 * `by_gameId` index is for.
 */
export const gamePinAttempts = defineTable({
  gameId: v.id("games"),
  profileId: v.id("profiles"),
  failedCount: v.number(),
  lastFailedAt: v.number(),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_profileId", ["gameId", "profileId"]);
