"use client";

import { useMemo, useState, useCallback } from "react";
import { GameSessionState } from "@/types/game/type";
import { useMafiaKillAuthority } from "./useMafiaKillAuthority";
import { useGameRoom } from "@/lib/context/gameRoomContext";

export interface MafiaTargetSelectionResult {
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  isMafiaTargetSelected: boolean;
  shouldShowMafiaTargetIndicator: boolean;
  canShowMafiaKillButton: boolean;
  /** Set local mafia target (for mafia player to track their own selection) */
  setLocalMafiaTarget: (seatNumber: number | null) => void;
  /** Local mafia target (only visible to the mafia player who selected) */
  localMafiaTarget: number | null;
}

/**
 * Hook to determine mafia target selection state and visibility.
 * 
 * Security model:
 * - Mafia player with authority: sees their own selection via localMafiaTarget
 * - Host: sees target via nightPhaseSession from context (RLS protected)
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
  // Get night phase session from context (host only via RLS)
  const { nightPhaseSession } = useGameRoom();

  // Local state for mafia player to track their own selection
  const [localMafiaTarget, setLocalMafiaTarget] = useState<number | null>(null);

  // Mafia kill authority - for mafia_chooses_target phase
  const { hasAuthority: hasMafiaKillAuthority, isMafiaPhase } =
    useMafiaKillAuthority();

  // Setter for local target with callback stability
  const setLocalTarget = useCallback((target: number | null) => {
    setLocalMafiaTarget(target);
  }, []);

  // Check if this target is selected for mafia kill
  // For host: check nightPhaseSession.mafia_target
  // For mafia with authority: check localMafiaTarget
  const isMafiaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInMafiaPhase = gameSessionState.game_phase === "mafia_chooses_target";
    if (!isInMafiaPhase) return false;

    // Host sees from night phase session
    if (isViewerHost && nightPhaseSession) {
      return nightPhaseSession.mafia_target === seatNumber;
    }

    // Mafia with authority sees their own local selection
    if (hasMafiaKillAuthority) {
      return localMafiaTarget === seatNumber;
    }

    return false;
  }, [
    gameSessionState,
    seatNumber,
    isViewerHost,
    nightPhaseSession,
    hasMafiaKillAuthority,
    localMafiaTarget,
  ]);

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
    setLocalMafiaTarget: setLocalTarget,
    localMafiaTarget,
  };
}
