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

import { GAME_PHASES } from "../../lib/constants";
import type { Phase, PhaseContext } from "../core/types";

export const JAPANESE_PHASES = GAME_PHASES;

const HOST_ADVANCE: Record<string, Phase> = {
  picking_roles: "mafia_meet",
  mafia_meet: "don_chooses_right_hand",
  don_chooses_right_hand: "yakuda_shogun_meet",
  yakuda_shogun_meet: "detective_meet",
  detective_meet: "doctor_meet",
  doctor_meet: "introduction_phase",
  night_phase: "mafia_chooses_target",
  mafia_chooses_target: "don_checks_for_detective",
  don_checks_for_detective: "right_hand_checks_for_yakuza",
  right_hand_checks_for_yakuza: "yakuza_and_shogun_chooses_target",
  yakuza_and_shogun_chooses_target: "detective_checks_for_mafia",
  detective_checks_for_mafia: "doctor_heals_player",
  doctor_heals_player: "farewell_speech",
  voting: "repeat",
};

export function japaneseNextPhase(
  phase: Phase,
  _ctx?: PhaseContext,
): Phase | null {
  return HOST_ADVANCE[phase] ?? null;
}
