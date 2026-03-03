"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAllHealedPlayers } from "@/lib/nightPhase/actions";

/**
 * Hook to fetch healed players once per game context (not per participant).
 * Re-fetches when the night number changes (new night → new potential heals).
 */
export function useHealedPlayers(
  gameId: string,
  currentNightNumber: number | null | undefined,
  enabled: boolean
) {
  const [healedPlayers, setHealedPlayers] = useState<number[]>([]);

  const fetchHealed = useCallback(async () => {
    if (!gameId || !enabled) return;
    try {
      const result = await fetchAllHealedPlayers(gameId);
      if (result.ok) {
        setHealedPlayers(result.healedPlayers);
      }
    } catch (error) {
      console.error("Error fetching healed players:", error);
    }
  }, [gameId, enabled]);

  useEffect(() => {
    void fetchHealed();
  }, [fetchHealed, currentNightNumber]);

  return { healedPlayers };
}
