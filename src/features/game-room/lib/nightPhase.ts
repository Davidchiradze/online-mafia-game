import { GamePhase } from "@/shared/lib/constants/game";
/**
 * Night-phase titles.
 *
 * SILENT FAILURE MODE: the night is a long chain of near-identical host states,
 * and the only thing distinguishing them is the phase name. There is exactly
 * ONE case where the phase name is not enough, and it is easy to lose: in a
 * variant whose mafia do not kill on the first night, they only meet and plan,
 * so `mafia_chooses_target` must be labelled as a meeting. Getting that wrong
 * does not throw — the host simply waits for a target that is never coming.
 *
 * That rule used to live inside `PhaseTitle`. It lives here so the host panel
 * and the players' title read it from the same place. It also used to be
 * hardcoded to `nightNumber === 1`, which is the JAPANESE answer: Sports kills
 * on night 1 and was mislabelled on the one night its Best Move depends on the
 * mafia having shot.
 */

/**
 * The `game.phases.*` key for a night phase title.
 *
 * `mafiaKillsOnFirstNight` comes from `definition.flags` — see `useGameFlags`.
 * When it is false the first night has no kill, so the "chooses target" phase
 * is labelled as a meeting instead.
 */
export function nightPhaseLabelKey(
  phase: string,
  nightNumber: number,
  mafiaKillsOnFirstNight: boolean,
): string {
  if (
    !mafiaKillsOnFirstNight &&
    phase === GamePhase.MAFIA_CHOOSES_TARGET &&
    nightNumber === 1
  ) {
    return "mafia_meets_first_night";
  }
  return phase;
}
