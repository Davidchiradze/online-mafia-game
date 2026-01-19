"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { checkMafiaKillAuthority } from "@/lib/nightPhase/actions";
import { GAME_PHASES } from "@/lib/constants/game";

/**
 * Hook to determine if the current user has authority to select a mafia kill target.
 *
 * Authority is determined by:
 * 1. Current game phase must be "mafia_chooses_target"
 * 2. User must be a mafia team member (DON, MAFIA, MAFIA_RIGHT_HAND)
 * 3. Authority goes to highest-ranking alive mafia member (DON > RIGHT_HAND > MAFIA)
 */
export function useMafiaKillAuthority() {
  const { gameId, userId, gameSessionState, isHost, players } = useGameRoom();
  const [hasAuthority, setHasAuthority] = useState(false);
  const [authorityRole, setAuthorityRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're in the mafia_chooses_target phase
  const isMafiaPhase = useMemo(() => {
    return gameSessionState?.game_phase === GAME_PHASES[9]; // "mafia_chooses_target"
  }, [gameSessionState?.game_phase]);

  const refetch = useCallback(async () => {
    // Host doesn't have kill authority (they observe)
    // Only check during mafia phase
    if (!gameId || !isMafiaPhase || isHost) {
      setHasAuthority(false);
      setAuthorityRole(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkMafiaKillAuthority(gameId);
      if (result.ok) {
        setHasAuthority(result.hasAuthority);
        setAuthorityRole(result.role);
      } else {
        setHasAuthority(false);
        setAuthorityRole(null);
        console.error("Failed to check mafia kill authority:", result.message);
      }
    } catch (error) {
      console.error("Error checking mafia kill authority:", error);
      setHasAuthority(false);
      setAuthorityRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isMafiaPhase, isHost]);

  // Refetch when phase changes or players change (someone might die)
  useEffect(() => {
    void refetch();
  }, [refetch, players]);

  return {
    /** Whether the current user has authority to select a mafia kill target */
    hasAuthority,
    /** The role that grants authority (DON, MAFIA_RIGHT_HAND, or MAFIA) */
    authorityRole,
    /** Whether we're in the mafia_chooses_target phase */
    isMafiaPhase,
    /** Whether the authority check is loading */
    isLoading,
    /** Manually refetch authority */
    refetch,
  };
}
