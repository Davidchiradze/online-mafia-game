"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { GamePhase } from "@/shared/lib/constants/game";

type GameSessionState = NonNullable<
  ReturnType<typeof useGameRoom>["gameSessionState"]
>;

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
 *
 * @param gameSessionState - Current game session state
 * @param seatNumber - Seat number of the target player being rendered
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target player is the host
 * @param isPlayerAlive - Whether the target player is alive
 * @param hasDoctorHealAuthority - Pre-computed authority from useNightActionAuthority
 * @param isDoctorPhase - Pre-computed phase check from useNightActionAuthority
 * @param healedPlayers - Seat numbers already healed (from context, fetched once)
 */
export function useDoctorHealSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean,
  hasDoctorHealAuthority: boolean,
  isDoctorPhase: boolean,
  healedPlayers: number[]
): DoctorHealSelectionResult {
  const { nightPhaseSession } = useGameRoom();

  const isAlreadyHealed = useMemo(() => {
    if (seatNumber === null) return false;
    return healedPlayers.includes(seatNumber);
  }, [healedPlayers, seatNumber]);

  const isHealSelectedThisNight = useMemo(() => {
    return nightPhaseSession?.healedPlayer !== undefined;
  }, [nightPhaseSession?.healedPlayer]);

  const isDoctorHealSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInDoctorPhase =
      gameSessionState.gamePhase === GamePhase.DOCTOR_HEALS_PLAYER;
    if (!isInDoctorPhase) return false;

    if (nightPhaseSession) {
      return nightPhaseSession.healedPlayer === seatNumber;
    }

    return false;
  }, [gameSessionState, seatNumber, nightPhaseSession]);

  const shouldShowDoctorHealIndicator = useMemo(() => {
    if (!isDoctorHealSelected) return false;
    return isViewerHost || hasDoctorHealAuthority;
  }, [isDoctorHealSelected, isViewerHost, hasDoctorHealAuthority]);

  const canShowDoctorHealButton = useMemo(() => {
    if (!isDoctorPhase || !hasDoctorHealAuthority) return false;
    if (isTargetHost) return false;
    if (isPlayerAlive === false) return false;
    // if (isAlreadyHealed) return false; // Can't heal same player twice in the game
    if (isHealSelectedThisNight) return false;
    return true;
  }, [
    isDoctorPhase,
    hasDoctorHealAuthority,
    isTargetHost,
    isPlayerAlive,
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
