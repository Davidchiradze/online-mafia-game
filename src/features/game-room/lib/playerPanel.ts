/**
 * What a PLAYER may be told about the current phase.
 *
 * SILENT FAILURE MODE: everything in the centre cell is read by twelve people
 * with different rights to it, and over-sharing does not throw — it just quietly
 * decides the game. The host's panel names the sleep buffer's destination, shows
 * every candidate's running vote count, and runs a countdown during the mafia's
 * pick. Reuse those descriptors for the player view and a citizen learns which
 * role wakes next.
 *
 * So the player's fields are derived here rather than borrowed. The two rules
 * with teeth are the phase clock (a kicker everyone is allowed to see) and the
 * timer gate (which only the acting roles are).
 */

import { GAME_PHASES } from "@/shared/lib/constants/game";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import type { Role } from "@/shared/lib/game/visibility";

export type PhaseClockKind = "night" | "dawn" | "day";

/** The "Night 2" / "Dawn 2" / "Day 3" kicker, or null before the clock starts. */
export type PhaseClock = { kind: PhaseClockKind; value: number } | null;

/** Every phase the night model owns — the meets, the actions, and the buffer. */
const NIGHT_PHASES: ReadonlySet<string> = new Set<string>([
  GAME_PHASES[2], // mafia_meet
  GAME_PHASES[3], // don_chooses_right_hand
  GAME_PHASES[4], // yakuda_shogun_meet
  GAME_PHASES[5], // detective_meet
  GAME_PHASES[6], // doctor_meet
  GAME_PHASES[8], // night_phase
  GAME_PHASES[9], // mafia_chooses_target
  GAME_PHASES[10], // don_checks_for_detective
  GAME_PHASES[11], // right_hand_checks_for_yakuza
  GAME_PHASES[12], // yakuza_and_shogun_chooses_target
  GAME_PHASES[13], // detective_checks_for_mafia
  GAME_PHASES[14], // doctor_heals_player
  GAME_PHASES[21], // phase_transition
  GAME_PHASES[22], // don_meet
]);

/** Daylight: the table is talking, and the round number is the day's. */
const DAY_PHASES: ReadonlySet<string> = new Set<string>([
  GAME_PHASES[7], // introduction_phase
  GAME_PHASES[16], // day_phase
  GAME_PHASES[17], // nominated_players_speak
  GAME_PHASES[18], // voting
]);

/**
 * The clock the phase belongs to.
 *
 * `farewell_speech` is the one phase that belongs to two of them, and the
 * signal telling them apart is the same one `advanceFromFarewell` routes on:
 * standing nominations mean the day already voted somebody out, so this is the
 * day's goodbye. Without them it is the dawn's, for whoever the night killed.
 */
export function phaseClock(
  phase: string,
  nightNumber: number,
  nominatedCount = 0,
): PhaseClock {
  const night = Math.max(1, nightNumber);

  if (NIGHT_PHASES.has(phase)) return { kind: "night", value: night };
  if (DAY_PHASES.has(phase)) {
    return { kind: "day", value: dayRoundFromNightNumber(nightNumber) };
  }
  if (phase === GAME_PHASES[23] /* best_move */) {
    return { kind: "dawn", value: night };
  }
  if (phase === GAME_PHASES[15] /* farewell_speech */) {
    return nominatedCount > 0
      ? { kind: "day", value: dayRoundFromNightNumber(nightNumber) }
      : { kind: "dawn", value: night };
  }
  // Pre-game and the end screens have no clock to show.
  return null;
}

/**
 * Whether this viewer may see the phase's decision countdown.
 *
 * The countdown is pressure applied to whoever is acting, and it is only ever
 * shown to them: a citizen watching a 20-second clock tick down learns exactly
 * how long the mafia have left to agree. Spectators are excluded outright —
 * they can be anyone, including a player on a second screen.
 */
export function canSeePhaseTimer(params: {
  isHost: boolean;
  isSpectator: boolean;
  viewerRole: string | null;
  awakeRoles: readonly Role[];
}): boolean {
  const { isHost, isSpectator, viewerRole, awakeRoles } = params;
  if (isSpectator) return false;
  if (isHost) return true;
  if (!viewerRole) return false;
  return awakeRoles.includes(viewerRole as Role);
}
