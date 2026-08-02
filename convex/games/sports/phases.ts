/**
 * Sports Mafia phase list + deterministic host-advance graph
 * (docs/variants/sports.md §3). Diff from Japanese: no `introduction_phase`,
 * `don_chooses_right_hand`, `yakuda_shogun_meet`, `doctor_meet`,
 * `right_hand_checks_for_yakuza`, `yakuza_and_shogun_chooses_target`, or
 * `doctor_heals_player`. The two info checks (`don_checks_for_detective`,
 * `detective_checks_for_mafia`) are kept, identical to Japanese.
 *
 * Sports adds a `don_meet` phase right after `mafia_meet`: the Don wakes alone so
 * the host and Don see each other (no right-hand pick — this is just the Don's
 * solo acknowledgement). Structurally it mirrors `don_checks_for_detective`
 * (awake role = DON, host + Don visible) but sits in the pre-day meet sequence.
 *
 * Phase-2 note: this is authored as DATA/spec (unit-tested), not yet wired to
 * any UI — the Sports phase buttons + `advanceUpdates` land in Phase 4.
 */

import type { Phase, PhaseContext } from "../core/types";

export const SPORTS_PHASES: readonly Phase[] = [
  "game_session_started",
  "picking_roles",
  "mafia_meet",
  "don_meet",
  "detective_meet",
  "day_phase",
  "nominated_players_speak",
  "voting",
  "night_phase",
  "mafia_chooses_target",
  "don_checks_for_detective",
  "detective_checks_for_mafia",
  "best_move",
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
  mafia_meet: "don_meet",
  don_meet: "detective_meet",
  detective_meet: "day_phase",
  night_phase: "mafia_chooses_target",
  mafia_chooses_target: "don_checks_for_detective",
  don_checks_for_detective: "detective_checks_for_mafia",
  detective_checks_for_mafia: "farewell_speech",
  // Deterministic: `best_move` is only ever entered when the night DID kill
  // someone (docs/variants/sports.md §6.1), so the farewell always follows. The
  // host's advance from here is always enabled — it doubles as "Skip Best Move"
  // so an AFK/disconnected victim can never stall the game (§6.3).
  best_move: "farewell_speech",
  voting: "repeat",
};

export function sportsNextPhase(
  phase: Phase,
  _ctx?: PhaseContext,
): Phase | null {
  return HOST_ADVANCE[phase] ?? null;
}
