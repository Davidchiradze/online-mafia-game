/**
 * Japanese night-action authority (docs/variants/japanese/rules.md).
 *
 * A SINGLE kill authority per team: for the mafia the DON while the DON lives,
 * then the living mafia in the lowest-numbered seat; SHOGUN > YAKUZA for the
 * yakuza (a lone SHOGUN cannot kill); and the DOCTOR heals. The hook gathers the
 * room context and delegates here via `ruleset.nightAuthority`.
 *
 * The mafia rule is NOT reimplemented here — it is `mafiaKillAuthority`, the
 * same pure function the server enforces in `selectMafiaTarget`. A second copy
 * would drift, and a drifted copy enables the kill button for a player the
 * server then rejects.
 */

import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES, GamePhase } from "@/shared/lib/constants/game";
import { mafiaKillAuthority } from "@convex/games/core/mafiaSuccession";
import type {
  NightActionAuthority,
  NightAuthorityInput,
} from "@/features/game-room/variants/core/types";

export function japaneseNightAuthority({
  phase,
  isHost,
  userId,
  viewerRole,
  players,
  roleOf,
}: NightAuthorityInput): NightActionAuthority {
  const isMafiaPhase = phase === GamePhase.MAFIA_CHOOSES_TARGET;
  const isYakuzaPhase = phase === GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET;
  const isDoctorPhase = phase === GamePhase.DOCTOR_HEALS_PLAYER;

  const holderOf = (role: string) =>
    players.find((p) => p.isAlive && roleOf(p.playerId) === role) ?? null;

  let hasMafiaKillAuthority = false;
  if (
    isMafiaPhase &&
    !isHost &&
    viewerRole &&
    MAFIA_TEAM_ROLES.includes(viewerRole as (typeof MAFIA_TEAM_ROLES)[number])
  ) {
    const holder = mafiaKillAuthority(
      players.map((p) => ({
        playerId: p.playerId,
        role: roleOf(p.playerId),
        seatNumber: p.seatNumber,
        isAlive: p.isAlive,
      })),
    );
    hasMafiaKillAuthority = holder?.playerId === userId;
  }

  let hasYakuzaKillAuthority = false;
  if (
    isYakuzaPhase &&
    !isHost &&
    viewerRole &&
    YAKUZA_TEAM_ROLES.includes(viewerRole as (typeof YAKUZA_TEAM_ROLES)[number])
  ) {
    const aliveYakuza = holderOf("YAKUZA");
    const aliveShogun = holderOf("SHOGUN");
    if (aliveYakuza) {
      hasYakuzaKillAuthority = aliveShogun
        ? aliveShogun.playerId === userId
        : aliveYakuza.playerId === userId;
    }
  }

  let hasDoctorHealAuthority = false;
  if (isDoctorPhase && !isHost && viewerRole === "DOCTOR") {
    hasDoctorHealAuthority = players.some(
      (p) => p.isAlive && p.playerId === userId,
    );
  }

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    hasYakuzaKillAuthority,
    isYakuzaPhase,
    hasDoctorHealAuthority,
    isDoctorPhase,
  };
}
