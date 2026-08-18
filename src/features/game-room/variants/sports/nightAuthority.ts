/**
 * Sports night-action authority (docs/variants/sports/rules.md §5).
 *
 * Unlike Japanese's single kill authority, EVERY living mafia (DON + each alive
 * MAFIA) may pick a target during `mafia_chooses_target` — each privately (§5.4).
 * There is no yakuza or doctor, so those authorities are always false.
 */

import { SPORTS_MAFIA_TEAM_ROLES } from "@convex/games/sports/roles";
import type {
  NightActionAuthority,
  NightAuthorityInput,
} from "@/features/game-room/variants/core/types";
import { GamePhase } from "@/shared/lib/constants/game";

const MAFIA_ROLES: ReadonlySet<string> = new Set(SPORTS_MAFIA_TEAM_ROLES);

export function sportsNightAuthority({
  phase,
  isHost,
  userId,
  viewerRole,
  players,
}: NightAuthorityInput): NightActionAuthority {
  const isMafiaPhase = phase === GamePhase.MAFIA_CHOOSES_TARGET;

  // Every living mafia acts (no priority). The viewer must be a living,
  // non-host mafia by role.
  const hasMafiaKillAuthority =
    isMafiaPhase &&
    !isHost &&
    !!viewerRole &&
    MAFIA_ROLES.has(viewerRole) &&
    players.some((p) => p.isAlive && p.playerId === userId);

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    hasYakuzaKillAuthority: false,
    isYakuzaPhase: false,
    hasDoctorHealAuthority: false,
    isDoctorPhase: false,
    // No Serial Killer in this variant.
    hasSerialKillerAuthority: false,
    isSerialKillerPhase: false,
  };
}
