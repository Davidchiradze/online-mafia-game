/**
 * Sports host-advance flow — the UI-side counterpart to Japanese `phaseFlow.ts`
 * (docs/variants/sports/rules.md §3). The logical destination comes from the pure
 * `sportsNextPhase` graph; whether an advance first sleeps through the neutral
 * `phase_transition` buffer is a presentation concern encoded here.
 *
 * Buffer-mediated sources are the night role-change boundaries: after a meet or
 * a check, everyone sleeps through the buffer before the next role wakes. In
 * particular `detective_checks_for_mafia` parks in the buffer with
 * `nextPhase: "farewell_speech"` — the SHARED `StartNextPhaseButton` recognizes
 * that resolve-marker and runs `startFarewellSpeech` (dawn kill resolution),
 * exactly as Japanese's `doctor_heals_player` does.
 */

import { sportsNextPhase } from "@convex/games/sports/phases";
import type { PhaseAdvanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";
import { GamePhase } from "@/shared/lib/constants/game";

/** Sources whose host-advance sleeps through the neutral buffer first. */
const BUFFER_MEDIATED: ReadonlySet<string> = new Set([
  GamePhase.MAFIA_MEET, // mafia sleep → don wakes alone
  GamePhase.DON_MEET, // don sleeps → detective wakes
  GamePhase.DETECTIVE_MEET, // night ends → everyone wakes for day 1
  GamePhase.DON_CHECKS_FOR_DETECTIVE, // don sleeps → detective wakes
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA, // detective sleeps → dawn resolution (farewell)
]);

export function sportsAdvanceUpdates(phase: string): PhaseAdvanceUpdates {
  const next = sportsNextPhase(phase);
  if (next === null) {
    throw new Error(`No host-advance edge from sports phase "${phase}"`);
  }
  if (BUFFER_MEDIATED.has(phase)) {
    return { gamePhase: GamePhase.PHASE_TRANSITION, nextPhase: next };
  }
  return { gamePhase: next };
}
