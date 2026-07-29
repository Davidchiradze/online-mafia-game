/**
 * Sports "best move" eligibility (docs/sports-mafia.md §6.1) — pure.
 *
 * The player killed on the FIRST night gets one public shot at naming 3 mafia
 * before their farewell speech. It is granted only when all three hold:
 *
 *   1. it is night 1 (a game has exactly one best move, or none);
 *   2. the night resolved to exactly one killed seat (§5.2 unanimity) — no kill
 *      means no victim, so there is nothing to grant;
 *   3. at most ONE player was eliminated during day round 1. Two or more day-1
 *      departures (the both-leave tie-break, or a vote-out plus a 4th-foul
 *      elimination) void the best move.
 *
 * On (3): the caller passes the count of dead seated players at the moment the
 * night resolves, which IS the day-1 elimination count — the night-1 victim is
 * still `isAlive: true` at that point (they only flip in
 * `farewellSpeech:markDeadAndAdvance`, during the farewell). So no separate day
 * counter is needed.
 */

import { SPORTS } from "../../lib/constants";

export type BestMoveEligibilityInput = {
  /** The night that just resolved (`gameSessions.currentNightNumber`). */
  nightNumber: number;
  /** Seats the night resolved to (`night.resolveKills(...).length`). */
  killedSeatCount: number;
  /** Dead SEATED players (host excluded) when the night resolved = day-1 kills. */
  deadSeatedCount: number;
};

export function isBestMoveEligible({
  nightNumber,
  killedSeatCount,
  deadSeatedCount,
}: BestMoveEligibilityInput): boolean {
  return nightNumber === 1 && killedSeatCount === 1 && deadSeatedCount <= 1;
}

/** True once the victim has named the full set — the phase's completion signal. */
export function isBestMoveComplete(suspects: readonly number[]): boolean {
  return suspects.length >= SPORTS.BEST_MOVE_SUSPECT_COUNT;
}
