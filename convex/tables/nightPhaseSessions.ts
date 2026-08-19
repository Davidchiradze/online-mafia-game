import { defineTable } from "convex/server";
import { v } from "convex/values";

export const nightPhaseSessions = defineTable({
  gameId: v.id("games"),
  nightNumber: v.number(),
  // Japanese `single-authority` scalars (unchanged).
  mafiaTarget: v.optional(v.number()),
  yakuzaTarget: v.optional(v.number()),
  healedPlayer: v.optional(v.number()),
  // Sports `unanimous-vote` night (docs/variants/sports/rules.md §5). Additive + optional
  // so existing Japanese rows validate unchanged; only Sports games populate them.
  // Per-mafia private selections recorded during the 5s kill window.
  mafiaTargetSelections: v.optional(
    v.array(v.object({ mafiaSeat: v.number(), targetSeat: v.number() })),
  ),
  // ISO timestamp the 5s selection window opened (drives the client countdown).
  mafiaTargetWindowStartedAt: v.optional(v.string()),
  // Flipped false by the scheduler at +5s; the server rejects late selections.
  mafiaTargetWindowActive: v.optional(v.boolean()),
  // Sports "best move" (docs/variants/sports/rules.md §6). Granted at dawn of night 1
  // only, when the mafia killed exactly one player AND at most one player was
  // eliminated on day 1. Additive + optional, so Japanese rows (and Sports
  // nights that grant no best move) validate unchanged.
  // The seat granted the best move — set iff the best move was granted.
  bestMoveSeat: v.optional(v.number()),
  // The 0-3 seats they named, in pick order. Completion is DERIVED
  // (`length === 3`) — there is no separate lock flag to keep in sync.
  bestMoveSuspects: v.optional(v.array(v.number())),
  // Serial Killer's one-per-game shot (docs/variants/serial_killer/rules.md §5).
  // The seat they fired at on this night, if any. Additive + optional, so every
  // existing row validates unchanged.
  //
  // "Already fired" is DERIVED from these rows, not stored as a flag — see
  // `isSerialKillerShotSpent` in `convex/lib/nightSessions.ts`. A flag would be
  // a second source of truth that could disagree with the night it came from.
  serialKillerTarget: v.optional(v.number()),
})
  .index("by_gameId", ["gameId"])
  .index("by_gameId_nightNumber", ["gameId", "nightNumber"]);
