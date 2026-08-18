/**
 * Serial Killer night-action authority
 * (docs/variants/serial_killer/rules.md §4).
 *
 * Japanese's shape minus the yakuza, plus the Serial Killer. The mafia's rule
 * is NOT reimplemented — it is `mafiaKillAuthority`, the same pure function the
 * server enforces in `selectMafiaTarget`. A second copy would drift, and a
 * drifted copy enables a button the server then rejects.
 *
 * The Serial Killer has NO succession: the faction is one player, and when they
 * die the ability dies with them.
 *
 * NOTE what this does NOT decide: whether the shot is still available. That is
 * night-1 and once-per-game state, which lives in the database, so it comes
 * from the server's `checkSerialKillerAuthority` query. This function answers
 * only "is this viewer the Serial Killer, in their phase".
 */

import { MAFIA_TEAM_ROLES, GamePhase } from "@/shared/lib/constants/game";
import { mafiaKillAuthority } from "@convex/games/core/mafiaSuccession";
import type {
  NightActionAuthority,
  NightAuthorityInput,
} from "@/features/game-room/variants/core/types";

export function serialKillerNightAuthority({
  phase,
  isHost,
  userId,
  viewerRole,
  players,
  roleOf,
}: NightAuthorityInput): NightActionAuthority {
  const isMafiaPhase = phase === GamePhase.MAFIA_CHOOSES_TARGET;
  const isSerialKillerPhase = phase === GamePhase.SERIAL_KILLER_CHOOSES_TARGET;
  const isDoctorPhase = phase === GamePhase.DOCTOR_HEALS_PLAYER;

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

  const hasSerialKillerAuthority =
    isSerialKillerPhase &&
    !isHost &&
    viewerRole === "SERIAL_KILLER" &&
    players.some((p) => p.isAlive && p.playerId === userId);

  const hasDoctorHealAuthority =
    isDoctorPhase &&
    !isHost &&
    viewerRole === "DOCTOR" &&
    players.some((p) => p.isAlive && p.playerId === userId);

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    // No yakuza clan in this variant.
    hasYakuzaKillAuthority: false,
    isYakuzaPhase: false,
    hasDoctorHealAuthority,
    isDoctorPhase,
    hasSerialKillerAuthority,
    isSerialKillerPhase,
  };
}
