"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/db/supabase/database.types";
import { JoinRequest } from "@/types/game/type";

export function useMyJoinRequestStatus(
  gameId: string,
  requesterId: string,
  onChange: (status: JoinRequest["status"]) => void
) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`jr_${gameId}_${requesterId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "join_requests",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const row = (payload as { new: unknown })
            .new as Tables<"join_requests">;
          if (row.requester_id === requesterId) {
            onChange(row.status as JoinRequest["status"]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "join_requests",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const row = (payload as { new: unknown })
            .new as Tables<"join_requests">;
          if (row.requester_id === requesterId)
            onChange(row.status as JoinRequest["status"]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, requesterId, onChange]);
}

export function usePendingJoinRequests(
  gameId: string,
  onEvent: (event: "insert" | "update", request: JoinRequest) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`jr_pending_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "join_requests",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) =>
          onEvent(
            "insert",
            (payload as { new: unknown })
              .new as Tables<"join_requests"> as unknown as JoinRequest
          )
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "join_requests",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) =>
          onEvent(
            "update",
            (payload as { new: unknown })
              .new as Tables<"join_requests"> as unknown as JoinRequest
          )
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, onEvent, enabled]);
}

