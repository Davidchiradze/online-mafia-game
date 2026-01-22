"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useMafiaKillAuthority } from "./useMafiaKillAuthority";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { MAFIA_TEAM_ROLES } from "@/lib/constants/game";

export interface MafiaTargetSelectionResult {
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  isMafiaTargetSelected: boolean;
  shouldShowMafiaTargetIndicator: boolean;
  canShowMafiaKillButton: boolean;
}

/**
 * Hook to determine mafia target selection state and visibility.
 *
 * Security model:
 * - Host: sees target via nightPhaseSession from context
 * - Mafia team members: see target via nightPhaseSession (temporary - RLS removed)
 * - Other players: cannot see targets
 *
 * @param gameSessionState - Current game session state
 * @param seatNumber - Seat number of the target player being rendered
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target player is the host
 * @param isPlayerAlive - Whether the target player is alive
 */
export function useMafiaTargetSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean
): MafiaTargetSelectionResult {
  // Get night phase session and viewer role from context
  const { nightPhaseSession, viewerRole } = useGameRoom();

  // Check if viewer is on mafia team
  const isViewerOnMafiaTeam = useMemo(() => {
    if (!viewerRole) return false;
    return MAFIA_TEAM_ROLES.includes(
      viewerRole as (typeof MAFIA_TEAM_ROLES)[number]
    );
  }, [viewerRole]);

  // Mafia kill authority - for mafia_chooses_target phase
  const { hasAuthority: hasMafiaKillAuthority, isMafiaPhase } =
    useMafiaKillAuthority();

  // Check if this target is selected for mafia kill
  // For host or mafia team members: check nightPhaseSession.mafia_target
  const isMafiaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInMafiaPhase =
      gameSessionState.game_phase === "mafia_chooses_target";
    if (!isInMafiaPhase) return false;

    // Host or mafia team members can see from night phase session
    if ((isViewerHost || isViewerOnMafiaTeam) && nightPhaseSession) {
      return nightPhaseSession.mafia_target === seatNumber;
    }

    return false;
  }, [
    gameSessionState,
    seatNumber,
    isViewerHost,
    isViewerOnMafiaTeam,
    nightPhaseSession,
  ]);

  // Should show the selected target indicator (skull) - visible to host and all mafia team members
  const shouldShowMafiaTargetIndicator = useMemo(() => {
    if (!isMafiaTargetSelected) return false;
    // Show to host or any mafia team member
    return isViewerHost || isViewerOnMafiaTeam;
  }, [isMafiaTargetSelected, isViewerHost, isViewerOnMafiaTeam]);

  // Can show mafia kill button: during mafia phase, viewer has authority, target is alive and not host
  // Hide buttons once a target has been selected (no changing target)
  const canShowMafiaKillButton = useMemo(() => {
    if (!isMafiaPhase || !hasMafiaKillAuthority) return false;
    if (isTargetHost) return false; // Can't target host
    if (isPlayerAlive === false) return false; // Can't target dead players
    // Hide if a target has already been selected (cannot change decision)
    if (
      nightPhaseSession?.mafia_target !== null &&
      nightPhaseSession?.mafia_target !== undefined
    )
      return false;
    return true;
  }, [
    isMafiaPhase,
    hasMafiaKillAuthority,
    isTargetHost,
    isPlayerAlive,
    nightPhaseSession?.mafia_target,
  ]);

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    isMafiaTargetSelected,
    shouldShowMafiaTargetIndicator,
    canShowMafiaKillButton,
  };
}
