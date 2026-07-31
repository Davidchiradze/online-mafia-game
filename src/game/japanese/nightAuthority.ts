/**
 * Japanese night-action authority (docs/game-design.md).
 *
 * A pure extraction of the logic that used to live inline in
 * `useNightActionAuthority`: a SINGLE kill authority per team —
 * DON > MAFIA_RIGHT_HAND > MAFIA for the mafia, SHOGUN > YAKUZA for the yakuza
 * (a lone SHOGUN cannot kill), and the DOCTOR heals. The hook now gathers the
 * room context and delegates here via `ruleset.nightAuthority`. Behavior is
 * unchanged (imports-only move for the hook).
 */

import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "@/lib/constants/game";
import type {
  NightActionAuthority,
  NightAuthorityInput,
} from "@/game/core/types";

const MAFIA_KILL_PRIORITY = ["DON", "MAFIA_RIGHT_HAND", "MAFIA"] as const;

export function japaneseNightAuthority({
  phase,
  isHost,
  userId,
  viewerRole,
  players,
  roleOf,
}: NightAuthorityInput): NightActionAuthority {
  const isMafiaPhase = phase === "mafia_chooses_target";
  const isYakuzaPhase = phase === "yakuza_and_shogun_chooses_target";
  const isDoctorPhase = phase === "doctor_heals_player";

  const holderOf = (role: string) =>
    players.find((p) => p.isAlive && roleOf(p.playerId) === role) ?? null;

  let hasMafiaKillAuthority = false;
  if (
    isMafiaPhase &&
    !isHost &&
    viewerRole &&
    MAFIA_TEAM_ROLES.includes(viewerRole as (typeof MAFIA_TEAM_ROLES)[number])
  ) {
    for (const priorityRole of MAFIA_KILL_PRIORITY) {
      const holder = holderOf(priorityRole);
      if (holder) {
        hasMafiaKillAuthority = holder.playerId === userId;
        break;
      }
    }
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
