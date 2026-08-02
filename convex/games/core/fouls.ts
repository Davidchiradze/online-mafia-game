/**
 * Shared foul mechanics that a variant switches on via a definition flag
 * (docs/variants/sports.md §4.2). Pure + variant-agnostic — no `ctx.db`, so it is
 * unit-testable in isolation and safe to import anywhere.
 *
 * The 3rd-foul SPEAKING BAN (Sports, gated on `flags.thirdFoulSpeakingBan`):
 * when a player reaches their 3rd foul they lose their 1-minute day speech on
 * the NEXT day phase only. The 4th-foul ELIMINATION
 * (`FOULS.ELIMINATION_THRESHOLD`) is retained across every variant and stays in
 * `dayPhase.giveFoul`.
 */

import { FOULS } from "../../lib/constants";
import { dayRoundFromNightNumber } from "./dayRound";

/** The foul count at which the speaking ban is applied. */
export const THIRD_FOUL_BAN_COUNT = FOULS.MAX_FOULS; // 3

/**
 * The final day phase carve-out: when this few players (or fewer) are alive the
 * ban is lifted — a banned player still speaks, for 30s instead of 60s (the
 * shortened duration is a UI concern; the server only decides they DO speak).
 */
export const LAST_DAY_ALIVE_MAX = FOULS.ELIMINATION_THRESHOLD; // 4

/**
 * Given the session's `currentNightNumber` when the 3rd foul lands, the day
 * round the player is muted for: the day phase immediately AFTER the current
 * one. Fouls are given during the current day round (derived from the night
 * number), so the ban applies exactly one round later.
 */
export function foulSpeakingBanRound(currentNightNumber: number): number {
  return dayRoundFromNightNumber(currentNightNumber) + 1;
}

type PlayerForBan = {
  foulSpeakingBanRound?: number;
};

/**
 * Whether a player is muted from their day speech this round.
 *
 * @param player           the player (reads `foulSpeakingBanRound`)
 * @param currentDayRound  the round of the day phase now starting
 * @param aliveCount       living non-host players (for the last-day carve-out)
 */
export function isSpeakingBanned(
  player: PlayerForBan,
  currentDayRound: number,
  aliveCount: number,
): boolean {
  if (aliveCount <= LAST_DAY_ALIVE_MAX) return false;
  return player.foulSpeakingBanRound === currentDayRound;
}
