import { defineTable } from "convex/server";
import { v } from "convex/values";

export const nightPhaseSessions = defineTable({
  gameId: v.id("games"),
  nightNumber: v.number(),
  // Japanese `single-authority` scalars (unchanged).
  mafiaTarget: v.optional(v.number()),
  yakuzaTarget: v.optional(v.number()),
  healedPlayer: v.optional(v.number()),
  // Sports `unanimous-vote` night (docs/sports-mafia.md §5). Additive + optional
  // so existing Japanese rows validate unchanged; only Sports games populate them.
  // Per-mafia private selections recorded during the 5s kill window.
  mafiaTargetSelections: v.optional(
    v.array(v.object({ mafiaSeat: v.number(), targetSeat: v.number() })),
  ),
  // ISO timestamp the 5s selection window opened (drives the client countdown).
  mafiaTargetWindowStartedAt: v.optional(v.string()),
  // Flipped false by the scheduler at +5s; the server rejects late selections.
  mafiaTargetWindowActive: v.optional(v.boolean()),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_nightNumber", ["gameId", "nightNumber"]);
