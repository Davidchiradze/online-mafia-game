"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import {
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "@/lib/constants/game";

export interface NightActionAuthority {
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  hasYakuzaKillAuthority: boolean;
  isYakuzaPhase: boolean;
  hasDoctorHealAuthority: boolean;
  isDoctorPhase: boolean;
}

const MAFIA_KILL_PRIORITY = ["DON", "MAFIA_RIGHT_HAND", "MAFIA"] as const;

/**
 * Pure-computation hook that derives night action authority from context data.
 * Replaces the three async authority hooks (useMafiaKillAuthority,
 * useYakuzaKillAuthority, useDoctorHealAuthority) with synchronous logic.
 *
 * Authority rules:
 * - Mafia kill: DON > MAFIA_RIGHT_HAND > MAFIA (highest alive gets authority)
 * - Yakuza kill: SHOGUN (if YAKUZA alive) > YAKUZA (if SHOGUN dead). SHOGUN alone cannot kill.
 * - Doctor heal: only DOCTOR
 * - Host never has action authority (observes only)
 */
export function useNightActionAuthority(): NightActionAuthority {
  const {
    userId,
    isHost,
    gameSessionState,
    players,
    viewerRole,
    playerRolesMap,
  } = useGameRoom();

  const currentPhase = gameSessionState?.game_phase ?? null;

  const isMafiaPhase = currentPhase === "mafia_chooses_target";
  const isYakuzaPhase = currentPhase === "yakuza_and_shogun_chooses_target";
  const isDoctorPhase = currentPhase === "doctor_heals_player";

  const hasMafiaKillAuthority = useMemo(() => {
    if (!isMafiaPhase || isHost) return false;
    if (
      !viewerRole ||
      !MAFIA_TEAM_ROLES.includes(
        viewerRole as (typeof MAFIA_TEAM_ROLES)[number],
      )
    )
      return false;

    // Find the highest-priority alive mafia member from visible roles
    for (const priorityRole of MAFIA_KILL_PRIORITY) {
      const holder = players.find((p) => {
        if (!p.is_alive || !p.player_id) return false;
        return playerRolesMap.get(p.player_id) === priorityRole;
      });
      if (holder) return holder.player_id === userId;
    }
    return false;
  }, [isMafiaPhase, isHost, viewerRole, players, playerRolesMap, userId]);

  const hasYakuzaKillAuthority = useMemo(() => {
    if (!isYakuzaPhase || isHost) return false;
    if (
      !viewerRole ||
      !YAKUZA_TEAM_ROLES.includes(
        viewerRole as (typeof YAKUZA_TEAM_ROLES)[number],
      )
    )
      return false;

    const aliveYakuza = players.find(
      (p) => p.is_alive && p.player_id && playerRolesMap.get(p.player_id) === "YAKUZA",
    );
    const aliveShogun = players.find(
      (p) => p.is_alive && p.player_id && playerRolesMap.get(p.player_id) === "SHOGUN",
    );

    if (!aliveYakuza) return false;
    if (aliveShogun) return aliveShogun.player_id === userId;
    return aliveYakuza.player_id === userId;
  }, [isYakuzaPhase, isHost, viewerRole, players, playerRolesMap, userId]);

  const hasDoctorHealAuthority = useMemo(() => {
    if (!isDoctorPhase || isHost) return false;
    if (viewerRole !== "DOCTOR") return false;

    const doctorPlayer = players.find((p) => {
      if (!p.is_alive || !p.player_id) return false;
      return p.player_id === userId;
    });
    return !!doctorPlayer;
  }, [isDoctorPhase, isHost, viewerRole, players, userId]);

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    hasYakuzaKillAuthority,
    isYakuzaPhase,
    hasDoctorHealAuthority,
    isDoctorPhase,
  };
}
