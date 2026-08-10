import { defineTable } from "convex/server";
import { v } from "convex/values";
import { winMethodValidator } from "./gameLogs";

export const gameSessions = defineTable({
  gameId: v.id("games"),
  gamePhase: v.string(),
  nextPhase: v.optional(v.string()),
  isFinished: v.boolean(),
  currentNightNumber: v.number(),
  currentSpeakerIndex: v.optional(v.number()),
  dayRoundOpenerIndex: v.optional(v.number()),
  foulEliminationOccurred: v.optional(v.boolean()),
  nominatedPlayers: v.array(v.number()),
  speakerStartedAt: v.optional(v.string()),
  speakingOrder: v.array(v.number()),
  withoutSelfJustification: v.optional(v.boolean()),
  startedAt: v.optional(v.number()), // ms epoch — set when play begins (startGame)
  // ms epoch — stamped on every phase change; drives the per-phase decision
  // countdown shown to the acting role(s) + host (visual only, see docs).
  phaseStartedAt: v.optional(v.number()),
  // ms epoch — set when the game is finished (finishGame / admin force-end);
  // drives the "room closes in Ns" countdown in the winner banner.
  finishedAt: v.optional(v.number()),
  // A decided faction win, or "no_contest" (total mutual elimination — nobody
  // left alive). "no_contest" pauses the game on the winner banner like a
  // faction win, but is logged as `winner: null` (no contest) with no ELO
  // change — the same terminal outcome as an admin force-end. See
  // docs/engine/win-check-seam.md.
  winner: v.optional(
    v.union(
      v.literal("mafia"),
      v.literal("yakuza"),
      v.literal("citizens"),
      v.literal("no_contest"),
    ),
  ),
  // Structured endgame snapshot captured when the winner is first decided.
  winMethod: v.optional(winMethodValidator),
}).index("by_gameId", ["gameId"]);
