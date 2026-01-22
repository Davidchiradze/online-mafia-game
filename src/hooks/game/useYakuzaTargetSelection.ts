"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useYakuzaKillAuthority } from "./useYakuzaKillAuthority";
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
 * Only YAKUZA can kill (SHOGUN cannot).
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
 */
export function useYakuzaTargetSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean
): YakuzaTargetSelectionResult {
  // Get night phase session and viewer role from context
  const { nightPhaseSession, viewerRole } = useGameRoom();

  // Check if viewer is on yakuza team
  const isViewerOnYakuzaTeam = useMemo(() => {
    if (!viewerRole) return false;
    return YAKUZA_TEAM_ROLES.includes(
      viewerRole as (typeof YAKUZA_TEAM_ROLES)[number]
    );
  }, [viewerRole]);

  // Yakuza kill authority - for yakuza_and_shogun_chooses_target phase
  const { hasAuthority: hasYakuzaKillAuthority, isYakuzaPhase } =
    useYakuzaKillAuthority();

  // Check if this target is selected for Yakuza kill
  // For host or yakuza team members: check nightPhaseSession.yakuza_target
  const isYakuzaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInYakuzaPhase =
      gameSessionState.game_phase === "yakuza_and_shogun_chooses_target";
    if (!isInYakuzaPhase) return false;

    // Host or yakuza team members can see from night phase session
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

  // Should show the selected target indicator - visible to host and all yakuza team members
  const shouldShowYakuzaTargetIndicator = useMemo(() => {
    if (!isYakuzaTargetSelected) return false;
    // Show to host or any yakuza team member
    return isViewerHost || isViewerOnYakuzaTeam;
  }, [isYakuzaTargetSelected, isViewerHost, isViewerOnYakuzaTeam]);

  // Can show Yakuza kill button: during Yakuza phase, viewer has authority, target is alive and not host
  // Hide buttons once a target has been selected (no changing target)
  const canShowYakuzaKillButton = useMemo(() => {
    if (!isYakuzaPhase || !hasYakuzaKillAuthority) return false;
    if (isTargetHost) return false; // Can't target host
    if (isPlayerAlive === false) return false; // Can't target dead players
    // Hide if a target has already been selected (cannot change decision)
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
