"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { GamePhase } from "@/shared/lib/constants/game";

type UseNominationOptions = {
  seatNumber: number | null;
  isViewerHost: boolean;
  isTargetHost: boolean;
};

/**
 * Hook to manage nomination state and visual effects for a player.
 *
 * @returns
 * - isNominated: Whether this player is currently in the nominatedPlayers array
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

  const isNominated = useMemo(() => {
    if (!gameSessionState) return false;
    const nominations = gameSessionState.nominatedPlayers ?? [];
    return seatNumber != null && nominations.includes(seatNumber);
  }, [gameSessionState, seatNumber]);

  const [showNominationEffect, setShowNominationEffect] = useState(false);
  const nominationEffectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isNominated) {
      if (nominationEffectTimeoutRef.current) {
        clearTimeout(nominationEffectTimeoutRef.current);
      }
      setShowNominationEffect(true);
      nominationEffectTimeoutRef.current = setTimeout(() => {
        setShowNominationEffect(false);
      }, 2000);
    } else {
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

  const isDayPhase = gameSessionState?.gamePhase === GamePhase.DAY_PHASE;

  const foulEliminationOccurred = gameSessionState?.foulEliminationOccurred ?? false;

  const canShowNominationButton =
    isViewerHost && isDayPhase && !isTargetHost && seatNumber != null && !foulEliminationOccurred;

  return {
    isNominated,
    showNominationEffect,
    canShowNominationButton,
    isDayPhase,
    foulEliminationOccurred,
  };
}
