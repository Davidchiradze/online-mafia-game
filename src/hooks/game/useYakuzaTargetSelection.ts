"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useYakuzaKillAuthority } from "./useYakuzaKillAuthority";

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
 */
export function useYakuzaTargetSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean
): YakuzaTargetSelectionResult {
  // Yakuza kill authority - for yakuza_and_shogun_chooses_target phase
  const { hasAuthority: hasYakuzaKillAuthority, isYakuzaPhase } =
    useYakuzaKillAuthority();

  // Check if this target is selected for Yakuza kill
  // Visible to both Yakuza with authority AND host during yakuza_and_shogun_chooses_target phase
  const isYakuzaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInYakuzaPhase =
      gameSessionState.game_phase === "yakuza_and_shogun_chooses_target";
    if (!isInYakuzaPhase) return false;
    const targets = gameSessionState.attempt_to_kill_players || [];
    // Yakuza target is the second element in the array [mafia, yakuza]
    // 0 is used as placeholder for empty slots
    return targets.length >= 2 && targets[1] !== 0 && targets[1] === seatNumber;
  }, [gameSessionState, seatNumber]);

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
  };
}
