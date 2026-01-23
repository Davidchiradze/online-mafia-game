"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/db/supabase/database.types";

export type VotingSession = Tables<"voting_sessions">;

/**
 * Hook to subscribe to voting session changes.
 * Provides real-time updates during the voting phase.
 *
 * Updates include:
 * - Current candidate being voted on
 * - Voting window active/inactive
 * - Vote counts per candidate
 * - Players who have voted
 * - Tie-break and both-leave vote states
 */
export function useVotingSessionListener(
  gameId: string,
  enabled: boolean = true
) {
  const [votingSession, setVotingSession] = useState<VotingSession | null>(
    null
  );

  useEffect(() => {
    if (!gameId || !enabled) return;

    const supabase = createClient();

    // Initial fetch
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("game_id", gameId)
        .maybeSingle();

      if (data) {
        setVotingSession(data);
      }
    };

    void fetchInitial();

    // Subscribe to changes - use separate .on() calls for each event type
    // (event: "*" with filter doesn't properly handle DELETE events)
    const channel = supabase
      .channel(`voting_session_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "voting_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setVotingSession(payload.new as VotingSession);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "voting_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setVotingSession(payload.new as VotingSession);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "voting_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setVotingSession(null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, enabled]);

  return { votingSession, setVotingSession };
}
