"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useDoctorHealAuthority } from "./useDoctorHealAuthority";

export interface DoctorHealSelectionResult {
  hasDoctorHealAuthority: boolean;
  isDoctorPhase: boolean;
  isAlreadyHealed: boolean;
  canShowDoctorHealButton: boolean;
  healedPlayers: number[];
}

/**
 * Hook to determine Doctor heal selection state and visibility.
 * Doctor can only heal each player ONCE per game.
 */
export function useDoctorHealSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean
): DoctorHealSelectionResult {
  // Doctor heal authority - for doctor_heals_player phase
  const {
    hasAuthority: hasDoctorHealAuthority,
    isDoctorPhase,
    healedPlayers,
  } = useDoctorHealAuthority();

  // Check if this player has already been healed (cannot heal same player twice)
  const isAlreadyHealed = useMemo(() => {
    if (seatNumber === null) return false;
    return healedPlayers.includes(seatNumber);
  }, [healedPlayers, seatNumber]);

  // Can show Doctor heal button: during Doctor phase, viewer has authority, target is alive, not host, and not already healed
  const canShowDoctorHealButton = useMemo(() => {
    if (!isDoctorPhase || !hasDoctorHealAuthority) return false;
    if (isTargetHost) return false; // Can't target host
    if (isPlayerAlive === false) return false; // Can't heal dead players
    // if (isAlreadyHealed) return false; // Can't heal same player twice
    return true;
  }, [
    isDoctorPhase,
    hasDoctorHealAuthority,
    isTargetHost,
    isPlayerAlive,
    isAlreadyHealed,
  ]);

  return {
    hasDoctorHealAuthority,
    isDoctorPhase,
    isAlreadyHealed,
    canShowDoctorHealButton,
    healedPlayers,
  };
}
