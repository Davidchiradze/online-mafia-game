"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { checkDoctorHealAuthority } from "@/lib/nightPhase/actions";

/**
 * Hook to determine if the current user has authority to heal a player.
 *
 * Authority is determined by:
 * 1. Current game phase must be "doctor_heals_player"
 * 2. User must be DOCTOR
 * 3. DOCTOR must be alive
 *
 * Also tracks which players have already been healed across ALL nights
 * (cannot heal same player twice per game).
 * 
 * Note: healedPlayers is fetched from the server via checkDoctorHealAuthority,
 * which queries all night_phase_sessions for this game.
 */
export function useDoctorHealAuthority() {
  const { gameId, gameSessionState, isHost, players } = useGameRoom();
  const [hasAuthority, setHasAuthority] = useState(false);
  const [authorityRole, setAuthorityRole] = useState<string | null>(null);
  const [healedPlayers, setHealedPlayers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're in the doctor_heals_player phase
  const isDoctorPhase = useMemo(() => {
    return gameSessionState?.game_phase === "doctor_heals_player";
  }, [gameSessionState?.game_phase]);

  const refetch = useCallback(async () => {
    // Host doesn't have heal authority (they observe)
    // Only check during Doctor phase
    if (!gameId || !isDoctorPhase || isHost) {
      setHasAuthority(false);
      setAuthorityRole(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkDoctorHealAuthority(gameId);
      if (result.ok) {
        setHasAuthority(result.hasAuthority);
        setAuthorityRole(result.role);
        setHealedPlayers(result.healedPlayers);
      } else {
        setHasAuthority(false);
        setAuthorityRole(null);
        setHealedPlayers([]);
        console.error("Failed to check Doctor heal authority:", result.message);
      }
    } catch (error) {
      console.error("Error checking Doctor heal authority:", error);
      setHasAuthority(false);
      setAuthorityRole(null);
      setHealedPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isDoctorPhase, isHost]);

  // Refetch when phase changes or players change (someone might die)
  useEffect(() => {
    void refetch();
  }, [refetch, players]);

  return {
    /** Whether the current user has authority to heal */
    hasAuthority,
    /** The role that grants authority (DOCTOR) */
    authorityRole,
    /** Whether we're in the doctor_heals_player phase */
    isDoctorPhase,
    /** Whether the authority check is loading */
    isLoading,
    /** Players who have already been healed (seat numbers) - cannot heal again */
    healedPlayers,
    /** Manually refetch authority */
    refetch,
  };
}
