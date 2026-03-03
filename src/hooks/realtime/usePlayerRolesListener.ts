"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to subscribe to game_player_roles table changes (INSERT/UPDATE)
 * Triggers refetch when role assignments change
 */
export function usePlayerRolesListener(
  gameId: string,
  refetchRoles: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!gameId || !enabled) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`game_player_roles_changes_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_player_roles",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          // When roles change, trigger a refetch to get filtered roles
          refetchRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, gameId, refetchRoles]);
}

