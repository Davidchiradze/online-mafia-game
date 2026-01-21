"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/db/supabase/database.types";

export type NightPhaseSession = Tables<"night_phase_sessions">;

/**
 * Hook for HOST ONLY to subscribe to night phase session changes.
 * Regular players cannot read this table due to RLS policy.
 * 
 * This provides real-time updates about:
 * - Mafia target selection
 * - Yakuza target selection  
 * - Doctor heal selection
 */
export function useNightPhaseSessionListener(
  gameId: string,
  enabled: boolean = true
) {
  const [currentNightSession, setCurrentNightSession] = 
    useState<NightPhaseSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCurrentSession = useCallback(async () => {
    if (!gameId) return;
    
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("night_phase_sessions")
        .select("*")
        .eq("game_id", gameId)
        .order("night_number", { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setCurrentNightSession(data);
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
    void fetchCurrentSession();

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
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
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
  }, [gameId, enabled, fetchCurrentSession]);

  return { 
    currentNightSession,
    isLoading,
    refetch: fetchCurrentSession,
  };
}

