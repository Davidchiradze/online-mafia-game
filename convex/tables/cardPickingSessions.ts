import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * cardPickingSessions
 *
 * Phase-scoped session that drives the `picking_roles` phase.
 * One row per active game; deleted with the game on cleanup.
 *
 * Lifecycle:
 *   - Created by `cardPicking.start` when the host enters `picking_roles`.
 *     The deck is pre-shuffled with hidden roles; each card has a stable
 *     `cardId` so the grid can render consistently for every viewer.
 *   - Mutated by `cardPicking.pickCard` (each pick claims one card and
 *     increments `currentPickIndex`).
 *   - Marked `isComplete: true` when every seat in `pickOrder` has picked.
 *
 * Visibility:
 *   - `role` on each card is hidden from non-claimers in the read query
 *     (`cardPicking.getState`) until either the viewer is the claimer,
 *     the viewer is the host, or the game is finished.
 *
 * Timer:
 *   - `currentTurnStartedAt` is an ISO string (server-issued) consumed
 *     by `useServerTime()` on the client per `docs/server-time.md`.
 *     `expireTurn` (scheduled internalMutation) auto-picks a random
 *     remaining card if the picker stalls past the timeout.
 */
export const cardPickingSessions = defineTable({
  gameId: v.id("games"),
  deck: v.array(
    v.object({
      cardId: v.string(),
      role: v.string(),
      claimedByPlayerId: v.optional(v.id("profiles")),
      claimedBySeat: v.optional(v.number()),
      claimedAt: v.optional(v.number()),
    }),
  ),
  pickOrder: v.array(v.number()),
  currentPickIndex: v.number(),
  currentTurnStartedAt: v.optional(v.string()),
  isComplete: v.boolean(),
}).index("by_gameId", ["gameId"]);
