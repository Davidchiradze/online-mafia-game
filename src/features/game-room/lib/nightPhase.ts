import { GamePhase } from "@/shared/lib/constants/game";
/**
 * Night-phase titles.
 *
 * SILENT FAILURE MODE: the night is a long chain of near-identical host states,
 * and the only thing distinguishing them is the phase name. There is exactly
 * ONE case where the phase name is not enough, and it is easy to lose: on the
 * first night the mafia do not kill, they only meet and plan, so
 * `mafia_chooses_target` must be labelled as a meeting. Getting that wrong does
 * not throw — the host simply waits for a target that is never coming.
 *
 * That rule used to live inside `PhaseTitle`. It lives here so the host panel
 * and the players' title read it from the same place.
 */

/**
 * The `game.phases.*` key for a night phase title.
 *
 * On the first night the mafia have no kill — they meet and plan — so the
 * "chooses target" phase is labelled as a meeting instead.
 */
export function nightPhaseLabelKey(phase: string, nightNumber: number): string {
  if (phase === GamePhase.MAFIA_CHOOSES_TARGET && nightNumber === 1) {
    return "mafia_meets_first_night";
  }
  return phase;
}
