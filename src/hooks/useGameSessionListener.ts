"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameSessionState } from "@/types/game/type";

/**
 * Hook to subscribe to game_sessions table changes (INSERT/UPDATE)
 * Updates the provided setter when game session changes occur
 */
export function useGameSessionListener(
  gameId: string,
  setGameSessionState: React.Dispatch<
    React.SetStateAction<GameSessionState | null>
  >
) {
  useEffect(() => {
    if (!gameId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`game_session_changes_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const next = payload?.new as GameSessionState;
          if (next) setGameSessionState((prev) => ({ ...prev, ...next }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const next = payload?.new as GameSessionState;
          if (next) setGameSessionState((prev) => ({ ...prev, ...next }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, setGameSessionState]);
}
