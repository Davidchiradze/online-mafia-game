/**
 * Japanese phase list + the deterministic host-advance graph.
 *
 * The edges below are transcribed from the `End…` / `Start…` phase-button
 * components under `src/components/gameSession/phaseButtonsForHost/`, where the
 * "next phase" is today a hardcoded `GAME_PHASES[n]` literal
 * (docs/engine/variant-architecture.md §1).
 * This is the pure spec that `definition.nextPhase` reproduces; it is pinned by
 * `tests/game/phaseTransitionGraph.test.ts` (same expected values).
 *
 * Only STATE-INDEPENDENT edges live here. The branching transitions
 * (day→nominated/voting, farewell→day/night, introduction→night, repeat→night)
 * run through server mutations (`enterNightPhase` / `enterDayPhase` /
 * `enterVotingPhase`) and return `null` so the caller keeps that logic.
 *
 * NOTE: several sources first park the table in the neutral `phase_transition`
 * sleep buffer before the next group wakes; the buffer is an engine concern and
 * the destinations below are the LOGICAL next phase.
 */

import { GAME_PHASES, GamePhase } from "../../lib/constants";
import type { Phase, PhaseContext } from "../core/types";

export const JAPANESE_PHASES = GAME_PHASES;

const HOST_ADVANCE: Record<string, Phase> = {
  [GamePhase.PICKING_ROLES]: GamePhase.MAFIA_MEET,
  [GamePhase.MAFIA_MEET]: GamePhase.YAKUDA_SHOGUN_MEET,
  [GamePhase.YAKUDA_SHOGUN_MEET]: GamePhase.DETECTIVE_MEET,
  [GamePhase.DETECTIVE_MEET]: GamePhase.DOCTOR_MEET,
  [GamePhase.DOCTOR_MEET]: GamePhase.INTRODUCTION_PHASE,
  [GamePhase.NIGHT_PHASE]: GamePhase.MAFIA_CHOOSES_TARGET,
  [GamePhase.MAFIA_CHOOSES_TARGET]: GamePhase.DON_CHECKS_FOR_DETECTIVE,
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]:
    GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
  [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET]: GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: GamePhase.DOCTOR_HEALS_PLAYER,
  [GamePhase.DOCTOR_HEALS_PLAYER]: GamePhase.FAREWELL_SPEECH,
  [GamePhase.VOTING]: GamePhase.REPEAT,
};

export function japaneseNextPhase(
  phase: Phase,
  _ctx?: PhaseContext,
): Phase | null {
  return HOST_ADVANCE[phase] ?? null;
}
