import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Generic room-notification channel for a single game — surfaced to every client
 * in the room (players AND spectators) as a one-shot toast the first time they
 * see it (see src/hooks/game/useGameBroadcasts.ts). Rows are never persisted
 * client-side.
 *
 * Not staff-only: `kind` discriminates producers so the same channel carries
 * staff messages, system events, and future news pushes. `send` (staff) attaches
 * a denormalized sender snapshot; the internal `push` (system/automated) leaves
 * the sender fields absent. Adding a new `kind` is a one-line union change.
 *
 * Game-scoped and cleaned up automatically when the game is deleted
 * (`gameBroadcasts` is in GAME_RELATED_TABLES in convex/lib/games.ts) — no
 * separate retention cron.
 */
export const gameBroadcasts = defineTable({
  gameId: v.id("games"),
  kind: v.union(v.literal("staff"), v.literal("system"), v.literal("news")),
  text: v.string(),
  // Optional headline, e.g. for a news push.
  title: v.optional(v.string()),
  // Sender snapshot — absent for system/automated pushes. Denormalized at
  // write-time so the reactive query renders without a profile fan-out.
  senderId: v.optional(v.id("profiles")),
  senderNickname: v.optional(v.string()),
  senderRole: v.optional(v.string()),
  createdAt: v.number(),
})
  // Cascade-delete lookup + newest-first listing for a single game.
  .index("by_gameId", ["gameId", "createdAt"]);
