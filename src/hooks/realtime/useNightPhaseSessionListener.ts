"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/db/supabase/database.types";
import { fetchCurrentNightSession } from "@/lib/nightPhase/actions";

export type NightPhaseSession = Tables<"night_phase_sessions">;

/**
 * Hook to subscribe to night phase session changes.
 * NOTE: RLS removed temporarily - all players can read this table.
 *
 * This provides real-time updates about:
 * - Mafia target selection (visible to mafia team)
 * - Yakuza target selection (visible to yakuza team)
 * - Doctor heal selection (visible to host only)
 */
export function useNightPhaseSessionListener(
  gameId: string,
  enabled: boolean = true
) {
  const [currentNightSession, setCurrentNightSession] =
    useState<NightPhaseSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!gameId) return;

    setIsLoading(true);
    try {
      const result = await fetchCurrentNightSession(gameId);
      if (result.ok && result.data) {
        setCurrentNightSession(result.data);
      }
    } catch {
      // Host might not have a night session yet
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !enabled) return;

    // Initial fetch
    void fetchSession();

    // Subscribe to changes
    const supabase = createClient();
    const channel = supabase
      .channel(`night_phase_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "night_phase_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const next = payload.new as NightPhaseSession;
            if (next) {
              setCurrentNightSession((prev) => {
                // Only update if this is the current/latest night
                if (!prev || next.night_number >= prev.night_number) {
                  return next;
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, enabled, fetchSession]);

  return {
    currentNightSession,
    isLoading,
    refetch: fetchSession,
  };
}
