/**
 * Sports Mafia phase list + deterministic host-advance graph
 * (docs/variants/sports/rules.md §3). Diff from Japanese: no `introduction_phase`,
 * `yakuda_shogun_meet`, `doctor_meet`, `yakuza_and_shogun_chooses_target`, or
 * `doctor_heals_player`. The two info checks (`don_checks_for_detective`,
 * `detective_checks_for_mafia`) and `don_meet` are kept, identical to Japanese.
 *
 * `don_meet` sits right after `mafia_meet` in both variants: the mafia sleep and
 * the Don wakes alone so the host and Don see each other. Structurally it mirrors
 * `don_checks_for_detective` (awake role = DON, host + Don visible) but sits in
 * the pre-day meet sequence.
 *
 * Phase-2 note: this is authored as DATA/spec (unit-tested), not yet wired to
 * any UI — the Sports phase buttons + `advanceUpdates` land in Phase 4.
 */

import type { Phase, PhaseContext } from "../core/types";
import { GamePhase } from "../../lib/constants";

export const SPORTS_PHASES: readonly Phase[] = [
  GamePhase.GAME_SESSION_STARTED,
  GamePhase.PICKING_ROLES,
  GamePhase.MAFIA_MEET,
  GamePhase.DON_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DAY_PHASE,
  GamePhase.NOMINATED_PLAYERS_SPEAK,
  GamePhase.VOTING,
  GamePhase.NIGHT_PHASE,
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.BEST_MOVE,
  GamePhase.FAREWELL_SPEECH,
  GamePhase.REPEAT,
  GamePhase.END_GAME,
  GamePhase.PHASE_TRANSITION,
];

// Deterministic (state-independent) host-advance edges. Branching transitions
// (day→voting/night, farewell→day/night, night resolution) are owned by server
// mutations and return null. `detective_checks_for_mafia → farewell_speech` is
// the resolve-marker (Sports' last night check triggers the dawn resolution),
// replacing Japanese's `doctor_heals_player → farewell_speech`.
const HOST_ADVANCE: Record<string, Phase> = {
  [GamePhase.PICKING_ROLES]: GamePhase.MAFIA_MEET,
  [GamePhase.MAFIA_MEET]: GamePhase.DON_MEET,
  [GamePhase.DON_MEET]: GamePhase.DETECTIVE_MEET,
  [GamePhase.DETECTIVE_MEET]: GamePhase.DAY_PHASE,
  [GamePhase.NIGHT_PHASE]: GamePhase.MAFIA_CHOOSES_TARGET,
  [GamePhase.MAFIA_CHOOSES_TARGET]: GamePhase.DON_CHECKS_FOR_DETECTIVE,
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]: GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: GamePhase.FAREWELL_SPEECH,
  // Deterministic: `best_move` is only ever entered when the night DID kill
  // someone (docs/variants/sports/rules.md §6.1), so the farewell always follows. The
  // host's advance from here is always enabled — it doubles as "Skip Best Move"
  // so an AFK/disconnected victim can never stall the game (§6.3).
  [GamePhase.BEST_MOVE]: GamePhase.FAREWELL_SPEECH,
  [GamePhase.VOTING]: GamePhase.REPEAT,
};

export function sportsNextPhase(
  phase: Phase,
  _ctx?: PhaseContext,
): Phase | null {
  return HOST_ADVANCE[phase] ?? null;
}
