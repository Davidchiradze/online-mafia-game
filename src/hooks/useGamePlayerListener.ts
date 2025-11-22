"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameSessionState } from "@/types/game/type";
import type { Tables } from "@/db/supabase/database.types";

/**
 * Hook to subscribe to game_players table changes (INSERT/UPDATE)
 * Updates the player data in game session state for the current user
 */
export function useGamePlayerListener(
  gameId: string,
  userId: string,
  setGameSessionState: React.Dispatch<
    React.SetStateAction<GameSessionState | null>
  >
) {
  useEffect(() => {
    if (!gameId || !userId) return;
    const supabase = createClient();

    const playerChannel = supabase
      .channel(`game_players_changes_${gameId}_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newPlayerData = payload?.new as Tables<"game_players">;
          if (newPlayerData?.player_id === userId) {
            setGameSessionState((prev: GameSessionState | null) => {
              if (!prev) return prev;
              return { ...prev, playerData: newPlayerData };
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_players",
          filter: `player_id=eq.${userId}`,
        },
        (payload) => {
          const updatedPlayerData = payload?.new as Tables<"game_players">;
          setGameSessionState((prev: GameSessionState | null) => {
            if (!prev) return prev;
            return { ...prev, playerData: updatedPlayerData };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [gameId, userId, setGameSessionState]);
}
