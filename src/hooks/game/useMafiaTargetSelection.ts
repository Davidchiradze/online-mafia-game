"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useMafiaKillAuthority } from "./useMafiaKillAuthority";

export interface MafiaTargetSelectionResult {
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  isMafiaTargetSelected: boolean;
  shouldShowMafiaTargetIndicator: boolean;
  canShowMafiaKillButton: boolean;
}

/**
 * Hook to determine mafia target selection state and visibility.
 */
export function useMafiaTargetSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean
): MafiaTargetSelectionResult {
  // Mafia kill authority - for mafia_chooses_target phase
  const { hasAuthority: hasMafiaKillAuthority, isMafiaPhase } =
    useMafiaKillAuthority();

  // Check if this target is selected for mafia kill
  // Visible to both mafia with authority AND host during mafia_chooses_target phase
  const isMafiaTargetSelected = useMemo(() => {
    if (!gameSessionState) return false;
    const isInMafiaPhase =
      gameSessionState.game_phase === "mafia_chooses_target";
    if (!isInMafiaPhase) return false;
    const targets = gameSessionState.attempt_to_kill_players || [];
    // Mafia target is the first element in the array
    return targets.length > 0 && targets[0] === seatNumber;
  }, [gameSessionState, seatNumber]);

  // Should show the selected target indicator (skull) - visible to host and mafia with authority
  const shouldShowMafiaTargetIndicator = useMemo(() => {
    if (!isMafiaTargetSelected) return false;
    // Show to host or mafia with kill authority
    return isViewerHost || hasMafiaKillAuthority;
  }, [isMafiaTargetSelected, isViewerHost, hasMafiaKillAuthority]);

  // Can show mafia kill button: during mafia phase, viewer has authority, target is alive and not host
  const canShowMafiaKillButton = useMemo(() => {
    if (!isMafiaPhase || !hasMafiaKillAuthority) return false;
    if (isTargetHost) return false; // Can't target host
    if (isPlayerAlive === false) return false; // Can't target dead players
    // Don't show on own tile or other mafia tiles (handled by server, but UI hint)
    return true;
  }, [isMafiaPhase, hasMafiaKillAuthority, isTargetHost, isPlayerAlive]);

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    isMafiaTargetSelected,
    shouldShowMafiaTargetIndicator,
    canShowMafiaKillButton,
  };
}

