/**
 * Japanese host-advance flow — the single place that knows, for each phase, the
 * session `updates` the host's "advance" button applies. Replaces the positional
 * `GAME_PHASES[n]` literals that were duplicated across the phase-button
 * components (docs/engine/variant-architecture.md §1; §8 "phases by name, never by index").
 *
 * The LOGICAL destination comes from the pure `japaneseNextPhase` graph
 * (`definition.nextPhase`). Whether an advance first sleeps through the neutral
 * `phase_transition` buffer is a Japanese *presentation* concern and is encoded
 * here (the buffer phase isn't even part of the backend phase list).
 *
 * Phase-1 note: the buttons import this Japanese helper directly because the
 * per-`gameType` frontend-ruleset dispatch (P1-T8, resolved once in
 * `gameRoomContext`) does not exist yet. When it lands, buttons will read
 * `advanceUpdates` from the resolved ruleset instead of importing the Japanese
 * one. Pinned by `tests/game/phaseFlow.test.ts`.
 */

import { japaneseNextPhase } from "@convex/games/japanese/phases";
import { GamePhase } from "@/shared/lib/constants/game";

/**
 * Sources whose host-advance sleeps through the neutral buffer first.
 *
 * The rule is "buffer whenever the awake set changes across the edge" — whoever
 * is about to wake must never see who was just awake. Every night edge Japanese
 * has qualifies, which is why this is the whole night sequence.
 */
const BUFFER_MEDIATED: ReadonlySet<string> = new Set([
  GamePhase.MAFIA_MEET, // mafia sleep → don wakes alone
  GamePhase.DON_MEET, // don sleeps → yakuza + shogun wake
  GamePhase.YAKUDA_SHOGUN_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DOCTOR_MEET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE, // don sleeps → yakuza + shogun wake
  GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
]);

export type PhaseAdvanceUpdates = { gamePhase: string; nextPhase?: string };

/**
 * The session `updates` a host-advance from `phase` should apply.
 *
 * - Buffer-mediated sources park in `phase_transition` and stash the logical
 *   destination in `nextPhase` (applied later by `StartNextPhaseButton`).
 * - All other sources jump straight to the destination.
 *
 * Spread the result into the mutation `updates`, adding any extra fields the
 * button needs (e.g. `nominatedPlayers: []` when ending voting).
 */
export function advanceUpdates(phase: string): PhaseAdvanceUpdates {
  const next = japaneseNextPhase(phase);
  if (next === null) {
    throw new Error(`No host-advance edge from phase "${phase}"`);
  }
  if (BUFFER_MEDIATED.has(phase)) {
    return { gamePhase: GamePhase.PHASE_TRANSITION, nextPhase: next };
  }
  return { gamePhase: next };
}
