"use client";

import { useMemo, useState, useCallback } from "react";
import { GameSessionState } from "@/types/game/type";
import { useYakuzaKillAuthority } from "./useYakuzaKillAuthority";
import { useGameRoom } from "@/lib/context/gameRoomContext";

export interface YakuzaTargetSelectionResult {
  hasYakuzaKillAuthority: boolean;
  isYakuzaPhase: boolean;
  isYakuzaTargetSelected: boolean;
  shouldShowYakuzaTargetIndicator: boolean;
  canShowYakuzaKillButton: boolean;
  /** Set local yakuza target (for yakuza player to track their own selection) */
  setLocalYakuzaTarget: (seatNumber: number | null) => void;
  /** Local yakuza target (only visible to the yakuza player who selected) */
  localYakuzaTarget: number | null;
}

/**
 * Hook to determine Yakuza target selection state and visibility.
 * Only YAKUZA can kill (SHOGUN cannot).
 * 
 * Security model:
 * - Yakuza player with authority: sees their own selection via localYakuzaTarget
 * - Host: sees target via nightPhaseSession from context (RLS protected)
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
  // Get night phase session from context (host only via RLS)
  const { nightPhaseSession } = useGameRoom();

  // Local state for yakuza player to track their own selection
  const [localYakuzaTarget, setLocalYakuzaTarget] = useState<number | null>(null);

  // Yakuza kill authority - for yakuza_and_shogun_chooses_target phase
  const { hasAuthority: hasYakuzaKillAuthority, isYakuzaPhase } =
    useYakuzaKillAuthority();

  // Setter for local target with callback stability
  const setLocalTarget = useCallback((target: number | null) => {
    setLocalYakuzaTarget(target);
  }, []);

  // Check if this target is selected for Yakuza kill
  // For host: check nightPhaseSession.yakuza_target
  // For yakuza with authority: check localYakuzaTarget
  const isYakuzaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInYakuzaPhase =
      gameSessionState.game_phase === "yakuza_and_shogun_chooses_target";
    if (!isInYakuzaPhase) return false;

    // Host sees from night phase session
    if (isViewerHost && nightPhaseSession) {
      return nightPhaseSession.yakuza_target === seatNumber;
    }

    // Yakuza with authority sees their own local selection
    if (hasYakuzaKillAuthority) {
      return localYakuzaTarget === seatNumber;
    }

    return false;
  }, [
    gameSessionState,
    seatNumber,
    isViewerHost,
    nightPhaseSession,
    hasYakuzaKillAuthority,
    localYakuzaTarget,
  ]);

  // Should show the selected target indicator - visible to host and Yakuza with authority
  const shouldShowYakuzaTargetIndicator = useMemo(() => {
    if (!isYakuzaTargetSelected) return false;
    // Show to host or Yakuza with kill authority
    return isViewerHost || hasYakuzaKillAuthority;
  }, [isYakuzaTargetSelected, isViewerHost, hasYakuzaKillAuthority]);

  // Can show Yakuza kill button: during Yakuza phase, viewer has authority, target is alive and not host
  const canShowYakuzaKillButton = useMemo(() => {
    if (!isYakuzaPhase || !hasYakuzaKillAuthority) return false;
    if (isTargetHost) return false; // Can't target host
    if (isPlayerAlive === false) return false; // Can't target dead players
    // Don't show on own tile or other Yakuza tiles (handled by server, but UI hint)
    return true;
  }, [isYakuzaPhase, hasYakuzaKillAuthority, isTargetHost, isPlayerAlive]);

  return {
    hasYakuzaKillAuthority,
    isYakuzaPhase,
    isYakuzaTargetSelected,
    shouldShowYakuzaTargetIndicator,
    canShowYakuzaKillButton,
    setLocalYakuzaTarget: setLocalTarget,
    localYakuzaTarget,
  };
}
