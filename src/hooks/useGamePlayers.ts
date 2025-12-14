"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/db/supabase/database.types";

/**
 * Hook to fetch and subscribe to all game_players for a game.
 * Works even before the game session is created.
 */
export function useGamePlayers(
  gameId: string,
  enabled: boolean = true
): Tables<"game_players">[] {
  const [players, setPlayers] = useState<Tables<"game_players">[]>([]);

  useEffect(() => {
    if (!gameId || !enabled) return;
    const supabase = createClient();

    // Initial fetch
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", gameId)
        .order("seat_number", { ascending: true });

      if (!error && data) {
        setPlayers(data);
      }
    };

    fetchPlayers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`game_players_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newPlayer = payload?.new as Tables<"game_players">;
          setPlayers((prev) => {
            // Check if player already exists (by id)
            const exists = prev.some((p) => p.id === newPlayer.id);
            if (exists) return prev;
            return [...prev, newPlayer].sort((a, b) => {
              const aSeat = a.seat_number ?? 0;
              const bSeat = b.seat_number ?? 0;
              return Number(aSeat) - Number(bSeat);
            });
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
          const updatedPlayer = payload?.new as Tables<"game_players">;
          setPlayers((prev) => {
            const updated = prev.map((p) =>
              p.id === updatedPlayer.id ? updatedPlayer : p
            );
            return updated.sort((a, b) => {
              const aSeat = a.seat_number ?? 0;
              const bSeat = b.seat_number ?? 0;
              return Number(aSeat) - Number(bSeat);
            });
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
          const deletedPlayer = payload?.old as Tables<"game_players">;
          setPlayers((prev) => prev.filter((p) => p.id !== deletedPlayer.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, enabled]);

  return players;
}
