import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameType } from "./games";

/**
 * Structured snapshot of the endgame state at the moment the winner was decided.
 * The human-readable label (e.g. "Shogun in 1vs1") is derived in code from this
 * via `winMethodLabel` — never stored, so wording can change without migration.
 */
export const winMethodValidator = v.object({
  faction: v.union(
    v.literal("mafia"),
    v.literal("yakuza"),
    v.literal("citizens"),
  ),
  aliveTotal: v.number(), // N — total alive players when decided
  mafiaAlive: v.number(), // m — alive mafia-team members
  yakuzaAlive: v.boolean(),
  shogunAlive: v.boolean(),
  decidedRole: v.optional(v.string()), // headline role, e.g. "SHOGUN" in a 1v1
});

/**
 * Permanent, denormalized record of a finished game. Holds copies of all data
 * (not foreign keys), because the live game and its relations are cascade-deleted
 * ~60s after finishing. One record per game.
 */
export const gameLogs = defineTable({
  gameId: v.id("games"), // original id (may no longer exist after cleanup)
  gameCode: v.string(),
  gameName: v.string(),
  gameType,
  hostId: v.id("profiles"),
  hostNickname: v.string(),
  startedAt: v.number(), // ms epoch — when play began
  finishedAt: v.number(), // ms epoch — when finishGame ran
  winner: v.union(
    v.literal("mafia"),
    v.literal("yakuza"),
    v.literal("citizens"),
    v.null(), // incomplete / no decided winner
  ),
  winMethod: v.optional(winMethodValidator), // absent when incomplete
  players: v.array(
    v.object({
      playerId: v.id("profiles"),
      nickname: v.string(),
      seatNumber: v.optional(v.number()),
      role: v.string(),
      isAlive: v.boolean(), // final alive state at game end
    }),
  ),
})
  .index("by_gameId", ["gameId"])
  .index("by_hostId", ["hostId"]);
