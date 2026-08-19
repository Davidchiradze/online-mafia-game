/**
 * Serial Killer host-advance flow — the session `updates` the host's advance
 * button applies for each phase.
 *
 * The logical destination comes from the pure `serialKillerNextPhase` graph
 * (`definition.nextPhase`). Whether the advance first sleeps through the
 * neutral `phase_transition` buffer is a PRESENTATION concern and is encoded
 * here, exactly as Japanese does it.
 */

import { serialKillerNextPhase } from "@convex/games/serialkiller/phases";
import { GamePhase } from "@/shared/lib/constants/game";
import type { PhaseAdvanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";

/**
 * Sources whose host-advance sleeps through the neutral buffer first.
 *
 * The rule is "buffer whenever the awake set changes across the edge" — whoever
 * wakes next must never see who was just awake. Every night edge qualifies,
 * which is why this is the whole night sequence, the Serial Killer's two phases
 * included: they wake alone, so the table must be asleep on both sides of them.
 */
const BUFFER_MEDIATED: ReadonlySet<string> = new Set([
  GamePhase.MAFIA_MEET,
  GamePhase.DON_MEET,
  GamePhase.SERIAL_KILLER_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DOCTOR_MEET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
]);

export function serialKillerAdvanceUpdates(phase: string): PhaseAdvanceUpdates {
  const next = serialKillerNextPhase(phase);
  if (next === null) {
    throw new Error(`No host-advance edge from phase "${phase}"`);
  }
  if (BUFFER_MEDIATED.has(phase)) {
    return { gamePhase: GamePhase.PHASE_TRANSITION, nextPhase: next };
  }
  return { gamePhase: next };
}
