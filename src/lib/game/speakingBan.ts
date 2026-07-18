/**
 * Client-side helper for the Sports 3rd-foul speaking ban (docs/sports-mafia.md
 * §4.2). Reuses the pure, variant-agnostic server logic so client and server
 * agree from a single source of truth — the ban is a UI concern (muted players
 * stay in the speaking order; they are only rendered/muted differently).
 */

import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import { isSpeakingBanned } from "@convex/games/core/fouls";

/**
 * Whether a seat is muted from its day speech this round. Handles the final-day
 * carve-out internally (≤ 4 alive → not banned). Japanese never stamps
 * `foulSpeakingBanRound`, so this is always `false` there.
 */
export function isSeatMutedThisRound(
  player: { foulSpeakingBanRound?: number },
  currentNightNumber: number,
  aliveCount: number,
): boolean {
  return isSpeakingBanned(
    player,
    dayRoundFromNightNumber(currentNightNumber),
    aliveCount,
  );
}
