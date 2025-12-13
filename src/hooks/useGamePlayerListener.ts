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
  >,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!gameId || !userId || !enabled) return;
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
          setGameSessionState((prev: GameSessionState | null) => {
            if (!prev) return prev;
            const nextAll = [...(prev.allPlayers ?? [])];
            const idx = nextAll.findIndex((p) => p.id === newPlayerData.id);
            if (idx >= 0) nextAll[idx] = newPlayerData;
            else nextAll.push(newPlayerData);
            const nextState: GameSessionState = { ...prev, allPlayers: nextAll };
            if (newPlayerData?.player_id === userId)
              nextState.playerData = newPlayerData;
            return nextState;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const updatedPlayerData = payload?.new as Tables<"game_players">;
          setGameSessionState((prev: GameSessionState | null) => {
            if (!prev) return prev;
            const nextAll = [...(prev.allPlayers ?? [])];
            const idx = nextAll.findIndex((p) => p.id === updatedPlayerData.id);
            if (idx >= 0) nextAll[idx] = updatedPlayerData;
            else nextAll.push(updatedPlayerData);

            const nextState: GameSessionState = { ...prev, allPlayers: nextAll };
            if (updatedPlayerData.player_id === userId) {
              nextState.playerData = updatedPlayerData;
            }
            return nextState;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const deleted = payload?.old as Tables<"game_players">;
          setGameSessionState((prev: GameSessionState | null) => {
            if (!prev) return prev;
            const filtered = (prev.allPlayers || []).filter(
              (p) => p.id !== deleted.id
            );
            const nextState: GameSessionState = {
              ...prev,
              allPlayers: filtered,
            };
            if (deleted.player_id === userId) {
              // Keep playerData as-is; viewer has left the game
              nextState.playerData = prev.playerData;
            }
            return nextState;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [enabled, gameId, userId, setGameSessionState]);
}
