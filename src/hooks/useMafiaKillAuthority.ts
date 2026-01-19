"use client";

import { useEffect, useState, useCallback } from "react";
import { checkMafiaKillAuthority } from "@/lib/nightPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";

/**
 * Hook to determine if the current user has mafia kill authority.
 *
 * Kill authority priority:
 * 1. DON (if alive)
 * 2. MAFIA_RIGHT_HAND (if DON is dead)
 * 3. MAFIA (if both DON and MAFIA_RIGHT_HAND are dead)
 *
 * @returns Object containing:
 * - hasAuthority: Whether current user has kill authority
 * - authorityRole: The role that has authority (DON, MAFIA_RIGHT_HAND, or MAFIA)
 * - isLoading: Whether the check is in progress
 * - refetch: Function to manually refetch authority status
 */
export function useMafiaKillAuthority() {
  const { gameId, gameSessionState, viewerRole } = useGameRoom();
  const [hasAuthority, setHasAuthority] = useState(false);
  const [authorityRole, setAuthorityRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isMafiaPhase = gameSessionState?.game_phase === "mafia_chooses_target";
  const isMafiaRole = viewerRole === "DON" || viewerRole === "MAFIA_RIGHT_HAND" || viewerRole === "MAFIA";

  const fetchAuthority = useCallback(async () => {
    if (!gameId || !isMafiaPhase || !isMafiaRole) {
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
      }
    } catch (error) {
      console.error("Error checking mafia kill authority:", error);
      setHasAuthority(false);
      setAuthorityRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isMafiaPhase, isMafiaRole]);

  // Fetch authority when phase changes to mafia_chooses_target
  useEffect(() => {
    fetchAuthority();
  }, [fetchAuthority]);

  return {
    /** Whether the current user has mafia kill authority */
    hasAuthority,
    /** The role that currently has authority (DON, MAFIA_RIGHT_HAND, or MAFIA) */
    authorityRole,
    /** Whether the authority check is in progress */
    isLoading,
    /** Whether it's the mafia target selection phase */
    isMafiaPhase,
    /** Manually refetch authority status */
    refetch: fetchAuthority,
  };
}

