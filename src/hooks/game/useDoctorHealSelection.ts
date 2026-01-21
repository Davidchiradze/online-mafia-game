"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useDoctorHealAuthority } from "./useDoctorHealAuthority";
import { useGameRoom } from "@/lib/context/gameRoomContext";

export interface DoctorHealSelectionResult {
  hasDoctorHealAuthority: boolean;
  isDoctorPhase: boolean;
  isAlreadyHealed: boolean;
  canShowDoctorHealButton: boolean;
  healedPlayers: number[];
  /** Whether a heal has been selected this night */
  isHealSelectedThisNight: boolean;
  /** Whether this specific target is the healed player this night */
  isDoctorHealSelected: boolean;
  /** Whether to show the heal indicator (visible to doctor and host) */
  shouldShowDoctorHealIndicator: boolean;
}

/**
 * Hook to determine Doctor heal selection state and visibility.
 * Doctor can only heal each player ONCE per game.
 * Once a heal is selected for the current night, buttons disappear (cannot change decision).
 */
export function useDoctorHealSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean
): DoctorHealSelectionResult {
  // Get night phase session from context
  const { nightPhaseSession } = useGameRoom();

  // Doctor heal authority - for doctor_heals_player phase
  const {
    hasAuthority: hasDoctorHealAuthority,
    isDoctorPhase,
    healedPlayers,
  } = useDoctorHealAuthority();

  // Check if this player has already been healed (cannot heal same player twice in the game)
  const isAlreadyHealed = useMemo(() => {
    if (seatNumber === null) return false;
    return healedPlayers.includes(seatNumber);
  }, [healedPlayers, seatNumber]);

  // Check if a heal has been selected this night (cannot change decision)
  const isHealSelectedThisNight = useMemo(() => {
    return (
      nightPhaseSession?.healed_player !== null &&
      nightPhaseSession?.healed_player !== undefined
    );
  }, [nightPhaseSession?.healed_player]);

  // Check if this specific target is the healed player this night
  const isDoctorHealSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInDoctorPhase =
      gameSessionState.game_phase === "doctor_heals_player";
    if (!isInDoctorPhase) return false;

    // Check if this seat is the healed player
    if (nightPhaseSession) {
      return nightPhaseSession.healed_player === seatNumber;
    }

    return false;
  }, [gameSessionState, seatNumber, nightPhaseSession]);

  // Should show the heal indicator - visible to doctor and host
  const shouldShowDoctorHealIndicator = useMemo(() => {
    if (!isDoctorHealSelected) return false;
    // Show to host or doctor with heal authority
    return isViewerHost || hasDoctorHealAuthority;
  }, [isDoctorHealSelected, isViewerHost, hasDoctorHealAuthority]);

  // Can show Doctor heal button: during Doctor phase, viewer has authority, target is alive, not host,
  // not already healed in a previous night, and no heal selected this night yet
  const canShowDoctorHealButton = useMemo(() => {
    if (!isDoctorPhase || !hasDoctorHealAuthority) return false;
    if (isTargetHost) return false; // Can't target host
    if (isPlayerAlive === false) return false; // Can't heal dead players
    // if (isAlreadyHealed) return false; // Can't heal same player twice in the game
    // Hide if a heal has already been selected this night (cannot change decision)
    if (isHealSelectedThisNight) return false;
    return true;
  }, [
    isDoctorPhase,
    hasDoctorHealAuthority,
    isTargetHost,
    isPlayerAlive,
    isAlreadyHealed,
    isHealSelectedThisNight,
  ]);

  return {
    hasDoctorHealAuthority,
    isDoctorPhase,
    isAlreadyHealed,
    canShowDoctorHealButton,
    healedPlayers,
    isHealSelectedThisNight,
    isDoctorHealSelected,
    shouldShowDoctorHealIndicator,
  };
}
