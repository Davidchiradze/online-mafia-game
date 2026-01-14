"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type UseNominationOptions = {
  seatNumber: number | null;
  isViewerHost: boolean;
  isTargetHost: boolean;
};

/**
 * Hook to manage nomination state and visual effects for a player.
 *
 * @returns
 * - isNominated: Whether this player is currently in the nominated_players array
 * - showNominationEffect: Whether to show the visual effect (true for 2 seconds after nomination)
 * - canShowNominationButton: Whether to show the nomination button (host only, during day phase)
 * - isDayPhase: Whether we're currently in the day phase
 */
export function useNomination({
  seatNumber,
  isViewerHost,
  isTargetHost,
}: UseNominationOptions) {
  const { gameSessionState } = useGameRoom();

  // Check if this player is nominated
  const isNominated = useMemo(() => {
    if (!gameSessionState) return false;
    const nominations = gameSessionState.nominated_players ?? [];
    return seatNumber != null && nominations.includes(seatNumber);
  }, [gameSessionState, seatNumber]);

  // Track visual nomination effect (shows for 2 seconds then fades)
  const [showNominationEffect, setShowNominationEffect] = useState(false);
  const nominationEffectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger 2-second visual effect when nomination changes
  useEffect(() => {
    if (isNominated) {
      // Clear any existing timeout
      if (nominationEffectTimeoutRef.current) {
        clearTimeout(nominationEffectTimeoutRef.current);
      }
      // Show the effect
      setShowNominationEffect(true);
      // Hide after 2 seconds
      nominationEffectTimeoutRef.current = setTimeout(() => {
        setShowNominationEffect(false);
      }, 2000);
    } else {
      // Immediately hide if un-nominated
      setShowNominationEffect(false);
      if (nominationEffectTimeoutRef.current) {
        clearTimeout(nominationEffectTimeoutRef.current);
      }
    }
    return () => {
      if (nominationEffectTimeoutRef.current) {
        clearTimeout(nominationEffectTimeoutRef.current);
      }
    };
  }, [isNominated]);

  // Check if we're in day phase (nominations allowed)
  const isDayPhase = gameSessionState?.game_phase === "day_phase";

  // Show nomination button only for host during day phase and not on host's own tile
  const canShowNominationButton =
    isViewerHost && isDayPhase && !isTargetHost && seatNumber != null;

  return {
    isNominated,
    showNominationEffect,
    canShowNominationButton,
    isDayPhase,
  };
}
