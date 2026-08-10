/**
 * Client-side helper for the Sports 3rd-foul speaking ban (docs/variants/sports.md
 * §4.2). Reuses the pure, variant-agnostic server logic so client and server
 * agree from a single source of truth — the ban is a UI concern (muted players
 * stay in the speaking order; they are only rendered/muted differently).
 */

import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import { isSpeakingBanned, LAST_DAY_ALIVE_MAX } from "@convex/games/core/fouls";

/**
 * The ONLY phase the ban applies to: docs/variants/sports.md §4.2 bans the player
 * from "their 1-minute speech on the next day phase only". Every other speaking
 * phase keeps its speech — most importantly the `farewell_speech` of a player
 * killed the same night, which shares the banned round's night number and would
 * otherwise be swallowed by the ban.
 */
const BANNED_PHASE = "day_phase";

type SeatedPlayer = { isAlive: boolean; seatNumber?: number };

/**
 * Living players holding a PLAYING seat — the alive count the ban rules mean
 * (§4.2 counts players at the table, never the host).
 *
 * A raw `players.filter(p => p.isAlive)` over-counts: the host's `gamePlayers`
 * row is `isAlive: true` at seat `maxPlayers + 1` and never dies, and a
 * post-start joiner has no seat at all. Either one pushes the final-day
 * carve-out a whole player late (it would fire at 3 alive, not 4).
 * Same seat filter the server uses in `computeDaySpeakingOrder`.
 *
 * `maxPlayers === null` means the game doc has not loaded yet — the host seat is
 * indistinguishable then, so it is counted. The count skews high, which keeps a
 * banned player muted for that transient frame (fail-closed) rather than briefly
 * unlocking their mic.
 */
export function countAliveSeatedPlayers(
  players: SeatedPlayer[],
  maxPlayers: number | null,
): number {
  return players.filter(
    (p) =>
      p.isAlive &&
      p.seatNumber !== undefined &&
      (maxPlayers === null || p.seatNumber <= maxPlayers),
  ).length;
}

/**
 * Whether a seat is muted from its day speech this round. Handles the final-day
 * carve-out internally (≤ 4 alive → not banned). Japanese never stamps
 * `foulSpeakingBanRound`, so this is always `false` there.
 *
 * @param gamePhase the session's current phase — the ban is scoped to
 *                  `day_phase`; farewell / nominee speeches are never muted.
 */
export function isSeatMutedThisRound(
  player: { foulSpeakingBanRound?: number },
  currentNightNumber: number,
  aliveCount: number,
  gamePhase: string | undefined,
): boolean {
  if (gamePhase !== BANNED_PHASE) return false;
  return isSpeakingBanned(
    player,
    dayRoundFromNightNumber(currentNightNumber),
    aliveCount,
  );
}

/**
 * The other half of the final-day carve-out (§4.2): the banned player DOES speak
 * on the last day phase, but for **30 seconds instead of 60**. True exactly when
 * `isSeatMutedThisRound` returned `false` only because ≤ 4 players are alive —
 * so it is the shortened-speech flag for a seat that would otherwise be muted.
 */
export function hasShortenedFinalDaySpeech(
  player: { foulSpeakingBanRound?: number },
  currentNightNumber: number,
  aliveCount: number,
  gamePhase: string | undefined,
): boolean {
  if (gamePhase !== BANNED_PHASE) return false;
  if (aliveCount > LAST_DAY_ALIVE_MAX) return false;
  return (
    player.foulSpeakingBanRound === dayRoundFromNightNumber(currentNightNumber)
  );
}
