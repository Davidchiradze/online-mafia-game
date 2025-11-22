"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { JAPANESE_MAFIA_ROLE_LABEL } from "@/lib/constants/game";
import { toast } from "react-toastify";

/**
 * Hook to listen for role assignment and show notification using react-toastify
 */
export function useRoleAssignmentNotification(gameId: string, userId: string) {
  const supabase = createClient();

  useEffect(() => {
    if (!gameId || !userId) return;

    // Subscribe to changes in the game_players table for this specific player
    const channel = supabase
      .channel(`role_assignment:${gameId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_players",
          filter: `player_id=eq.${userId}`,
        },
        (payload) => {
          const newRole = payload.new.role as string | null;
          const oldRole = payload.old.role as string | null;

          // Only show notification if role changed from null/undefined to a value
          if (newRole && newRole !== oldRole) {
            const roleLabel =
              JAPANESE_MAFIA_ROLE_LABEL[
                newRole as keyof typeof JAPANESE_MAFIA_ROLE_LABEL
              ] || newRole;

            console.log(
              "🚀 ~ useRoleAssignmentNotification ~ roleLabel:",
              roleLabel
            );
            toast.success(`🎭 Your role: ${roleLabel}!`, {
              position: "top-right",
              autoClose: 8000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, userId, supabase]);
}
