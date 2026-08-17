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

import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import type { Role } from "@/shared/lib/game/visibility";
import { GamePhase } from "@/shared/lib/constants/game";

export type PhaseClockKind = "night" | "dawn" | "day";

/** The "Night 2" / "Dawn 2" / "Day 3" kicker, or null before the clock starts. */
export type PhaseClock = { kind: PhaseClockKind; value: number } | null;

/** Every phase the night model owns — the meets, the actions, and the buffer. */
const NIGHT_PHASES: ReadonlySet<string> = new Set<string>([
  GamePhase.MAFIA_MEET,
  GamePhase.YAKUDA_SHOGUN_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DOCTOR_MEET,
  GamePhase.NIGHT_PHASE,
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
  GamePhase.PHASE_TRANSITION,
  GamePhase.DON_MEET,
]);

/** Daylight: the table is talking, and the round number is the day's. */
const DAY_PHASES: ReadonlySet<string> = new Set<string>([
  GamePhase.INTRODUCTION_PHASE,
  GamePhase.DAY_PHASE,
  GamePhase.NOMINATED_PLAYERS_SPEAK,
  GamePhase.VOTING,
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
  if (phase === GamePhase.BEST_MOVE) {
    return { kind: "dawn", value: night };
  }
  if (phase === GamePhase.FAREWELL_SPEECH) {
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
