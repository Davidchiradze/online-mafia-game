"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useGameHostSubscription(
  gameId: string,
  onChange: (hostUserId: string) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`game_host_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const newHost = payload?.new?.host_id;
          if (newHost) onChange(newHost);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, onChange, enabled]);
}
