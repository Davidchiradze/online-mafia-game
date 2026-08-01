/**
 * Japanese host-advance flow — the single place that knows, for each phase, the
 * session `updates` the host's "advance" button applies. Replaces the positional
 * `GAME_PHASES[n]` literals that were duplicated across the phase-button
 * components (docs/game-types.md §1; §8 "phases by name, never by index").
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

/** Sources whose host-advance sleeps through the neutral buffer first. */
const BUFFER_MEDIATED: ReadonlySet<string> = new Set([
  "don_chooses_right_hand",
  "yakuda_shogun_meet",
  "detective_meet",
  "doctor_meet",
  "right_hand_checks_for_yakuza",
  "yakuza_and_shogun_chooses_target",
  "detective_checks_for_mafia",
  "doctor_heals_player",
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
    return { gamePhase: "phase_transition", nextPhase: next };
  }
  return { gamePhase: next };
}
