"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { checkYakuzaKillAuthority } from "@/lib/nightPhase/actions";

/**
 * Hook to determine if the current user has authority to select a Yakuza kill target.
 *
 * Authority is determined by:
 * 1. Current game phase must be "yakuza_and_shogun_chooses_target"
 * 2. User must be YAKUZA (SHOGUN cannot kill)
 * 3. YAKUZA must be alive
 */
export function useYakuzaKillAuthority() {
  const { gameId, gameSessionState, isHost, players } = useGameRoom();
  const [hasAuthority, setHasAuthority] = useState(false);
  const [authorityRole, setAuthorityRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're in the yakuza_and_shogun_chooses_target phase
  const isYakuzaPhase = useMemo(() => {
    return gameSessionState?.game_phase === "yakuza_and_shogun_chooses_target";
  }, [gameSessionState?.game_phase]);

  const refetch = useCallback(async () => {
    // Host doesn't have kill authority (they observe)
    // Only check during Yakuza phase
    if (!gameId || !isYakuzaPhase || isHost) {
      setHasAuthority(false);
      setAuthorityRole(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkYakuzaKillAuthority(gameId);
      if (result.ok) {
        setHasAuthority(result.hasAuthority);
        setAuthorityRole(result.role);
      } else {
        setHasAuthority(false);
        setAuthorityRole(null);
        console.error("Failed to check Yakuza kill authority:", result.message);
      }
    } catch (error) {
      console.error("Error checking Yakuza kill authority:", error);
      setHasAuthority(false);
      setAuthorityRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isYakuzaPhase, isHost]);

  // Refetch when phase changes or players change (someone might die)
  useEffect(() => {
    void refetch();
  }, [refetch, players]);

  return {
    /** Whether the current user has authority to select a Yakuza kill target */
    hasAuthority,
    /** The role that grants authority (YAKUZA only - SHOGUN cannot kill) */
    authorityRole,
    /** Whether we're in the yakuza_and_shogun_chooses_target phase */
    isYakuzaPhase,
    /** Whether the authority check is loading */
    isLoading,
    /** Manually refetch authority */
    refetch,
  };
}
