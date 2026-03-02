"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { YAKUZA_TEAM_ROLES } from "@/lib/constants/game";

export interface YakuzaTargetSelectionResult {
  hasYakuzaKillAuthority: boolean;
  isYakuzaPhase: boolean;
  isYakuzaTargetSelected: boolean;
  shouldShowYakuzaTargetIndicator: boolean;
  canShowYakuzaKillButton: boolean;
}

/**
 * Hook to determine Yakuza target selection state and visibility.
 * Kill authority: SHOGUN (if YAKUZA alive) > YAKUZA (if SHOGUN dead).
 *
 * Security model:
 * - Host: sees target via nightPhaseSession from context
 * - Yakuza team members: see target via nightPhaseSession (temporary - RLS removed)
 * - Other players: cannot see targets
 *
 * @param gameSessionState - Current game session state
 * @param seatNumber - Seat number of the target player being rendered
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target player is the host
 * @param isPlayerAlive - Whether the target player is alive
 * @param hasYakuzaKillAuthority - Pre-computed authority from useNightActionAuthority
 * @param isYakuzaPhase - Pre-computed phase check from useNightActionAuthority
 */
export function useYakuzaTargetSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean,
  hasYakuzaKillAuthority: boolean,
  isYakuzaPhase: boolean
): YakuzaTargetSelectionResult {
  const { nightPhaseSession, viewerRole } = useGameRoom();

  const isViewerOnYakuzaTeam = useMemo(() => {
    if (!viewerRole) return false;
    return YAKUZA_TEAM_ROLES.includes(
      viewerRole as (typeof YAKUZA_TEAM_ROLES)[number]
    );
  }, [viewerRole]);

  const isYakuzaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInYakuzaPhase =
      gameSessionState.game_phase === "yakuza_and_shogun_chooses_target";
    if (!isInYakuzaPhase) return false;

    if ((isViewerHost || isViewerOnYakuzaTeam) && nightPhaseSession) {
      return nightPhaseSession.yakuza_target === seatNumber;
    }

    return false;
  }, [
    gameSessionState,
    seatNumber,
    isViewerHost,
    isViewerOnYakuzaTeam,
    nightPhaseSession,
  ]);

  const shouldShowYakuzaTargetIndicator = useMemo(() => {
    if (!isYakuzaTargetSelected) return false;
    return isViewerHost || isViewerOnYakuzaTeam;
  }, [isYakuzaTargetSelected, isViewerHost, isViewerOnYakuzaTeam]);

  const canShowYakuzaKillButton = useMemo(() => {
    if (!isYakuzaPhase || !hasYakuzaKillAuthority) return false;
    if (isTargetHost) return false;
    if (isPlayerAlive === false) return false;
    if (
      nightPhaseSession?.yakuza_target !== null &&
      nightPhaseSession?.yakuza_target !== undefined
    )
      return false;
    return true;
  }, [
    isYakuzaPhase,
    hasYakuzaKillAuthority,
    isTargetHost,
    isPlayerAlive,
    nightPhaseSession?.yakuza_target,
  ]);

  return {
    hasYakuzaKillAuthority,
    isYakuzaPhase,
    isYakuzaTargetSelected,
    shouldShowYakuzaTargetIndicator,
    canShowYakuzaKillButton,
  };
}
