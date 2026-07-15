/**
 * Sports Mafia phase list + deterministic host-advance graph
 * (docs/sports-mafia.md §3). Diff from Japanese: no `introduction_phase`,
 * `don_chooses_right_hand`, `yakuda_shogun_meet`, `doctor_meet`,
 * `right_hand_checks_for_yakuza`, `yakuza_and_shogun_chooses_target`, or
 * `doctor_heals_player`. The two info checks (`don_checks_for_detective`,
 * `detective_checks_for_mafia`) are kept, identical to Japanese.
 *
 * Phase-2 note: this is authored as DATA/spec (unit-tested), not yet wired to
 * any UI — the Sports phase buttons + `advanceUpdates` land in Phase 4.
 */

import type { Phase, PhaseContext } from "../core/types";

export const SPORTS_PHASES: readonly Phase[] = [
  "game_session_started",
  "picking_roles",
  "mafia_meet",
  "detective_meet",
  "day_phase",
  "nominated_players_speak",
  "voting",
  "night_phase",
  "mafia_chooses_target",
  "don_checks_for_detective",
  "detective_checks_for_mafia",
  "farewell_speech",
  "repeat",
  "end_game",
  "phase_transition",
];

// Deterministic (state-independent) host-advance edges. Branching transitions
// (day→voting/night, farewell→day/night, night resolution) are owned by server
// mutations and return null. `detective_checks_for_mafia → farewell_speech` is
// the resolve-marker (Sports' last night check triggers the dawn resolution),
// replacing Japanese's `doctor_heals_player → farewell_speech`.
const HOST_ADVANCE: Record<string, Phase> = {
  picking_roles: "mafia_meet",
  mafia_meet: "detective_meet",
  detective_meet: "day_phase",
  night_phase: "mafia_chooses_target",
  mafia_chooses_target: "don_checks_for_detective",
  don_checks_for_detective: "detective_checks_for_mafia",
  detective_checks_for_mafia: "farewell_speech",
  voting: "repeat",
};

export function sportsNextPhase(
  phase: Phase,
  _ctx?: PhaseContext,
): Phase | null {
  return HOST_ADVANCE[phase] ?? null;
}
