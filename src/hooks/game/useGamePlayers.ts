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

    const upsertMany = (incoming: Tables<"game_players">[]) => {
      setPlayers((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const p of incoming) byId.set(p.id, p);
        return Array.from(byId.values()).sort(
          (a, b) => Number(a.seat_number ?? 0) - Number(b.seat_number ?? 0)
        );
      });
    };

    const refetch = async () => {
      const { data } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", gameId)
        .order("seat_number", { ascending: true });

      if (data) upsertMany(data);
    };

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
          upsertMany([payload.new as Tables<"game_players">]);
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
          upsertMany([payload.new as Tables<"game_players">]);
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
          const deleted = payload.old as Tables<"game_players">;
          setPlayers((prev) => prev.filter((p) => p.id !== deleted.id));
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          void refetch();
        }
      });

    // Backfill timeouts to catch any missed INSERT events
    const timeout5s = window.setTimeout(() => void refetch(), 5000);
    const timeout15s = window.setTimeout(() => void refetch(), 15000);

    return () => {
      window.clearTimeout(timeout5s);
      window.clearTimeout(timeout15s);
      supabase.removeChannel(channel);
    };
  }, [gameId, enabled]);

  return players;
}

