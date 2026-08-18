/**
 * Serial Killer Mafia phase list + deterministic host-advance graph
 * (docs/variants/serial_killer/rules.md §3).
 *
 * Diff from Japanese: the two yakuza phases are replaced one-for-one by the
 * Serial Killer's. Everything else — the introduction phase, both info checks,
 * the Doctor's heal, the whole day side — is Japanese's, unchanged.
 *
 *   yakuda_shogun_meet                 → serial_killer_meet
 *   yakuza_and_shogun_chooses_target   → serial_killer_chooses_target
 *
 * Keeping the SLOTS rather than appending matters: the night keeps its shape,
 * so the Doctor still heals last and `doctor_heals_player → farewell_speech`
 * stays the resolve-marker edge that triggers dawn.
 */

import type { Phase, PhaseContext } from "../core/types";
import { GamePhase } from "../../lib/constants";

export const SERIAL_KILLER_PHASES: readonly Phase[] = [
  GamePhase.GAME_SESSION_STARTED,
  GamePhase.PICKING_ROLES,
  GamePhase.MAFIA_MEET,
  GamePhase.DON_MEET,
  GamePhase.SERIAL_KILLER_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DOCTOR_MEET,
  GamePhase.INTRODUCTION_PHASE,
  GamePhase.NIGHT_PHASE,
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
  GamePhase.FAREWELL_SPEECH,
  GamePhase.DAY_PHASE,
  GamePhase.NOMINATED_PLAYERS_SPEAK,
  GamePhase.VOTING,
  GamePhase.REPEAT,
  GamePhase.END_GAME,
  GamePhase.PHASE_TRANSITION,
];

// Deterministic (state-independent) host-advance edges. Branching transitions
// (day→voting/night, farewell→day/night, introduction→night, repeat→night) are
// owned by server mutations and return null.
//
// `doctor_heals_player → farewell_speech` is the RESOLVE-MARKER edge: reaching
// the farewell is what makes the dawn seam resolve the night. Dropping it would
// leave a night that never resolves.
const HOST_ADVANCE: Record<string, Phase> = {
  [GamePhase.PICKING_ROLES]: GamePhase.MAFIA_MEET,
  [GamePhase.MAFIA_MEET]: GamePhase.DON_MEET,
  [GamePhase.DON_MEET]: GamePhase.SERIAL_KILLER_MEET,
  [GamePhase.SERIAL_KILLER_MEET]: GamePhase.DETECTIVE_MEET,
  [GamePhase.DETECTIVE_MEET]: GamePhase.DOCTOR_MEET,
  [GamePhase.DOCTOR_MEET]: GamePhase.INTRODUCTION_PHASE,
  [GamePhase.NIGHT_PHASE]: GamePhase.MAFIA_CHOOSES_TARGET,
  [GamePhase.MAFIA_CHOOSES_TARGET]: GamePhase.DON_CHECKS_FOR_DETECTIVE,
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]: GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
  [GamePhase.SERIAL_KILLER_CHOOSES_TARGET]: GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: GamePhase.DOCTOR_HEALS_PLAYER,
  [GamePhase.DOCTOR_HEALS_PLAYER]: GamePhase.FAREWELL_SPEECH,
  [GamePhase.VOTING]: GamePhase.REPEAT,
};

export function serialKillerNextPhase(
  phase: Phase,
  _ctx?: PhaseContext,
): Phase | null {
  return HOST_ADVANCE[phase] ?? null;
}
