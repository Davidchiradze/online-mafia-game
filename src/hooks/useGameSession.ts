"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameRoom } from "@/types/game/type";
import { startGame as startGameAction } from "@/lib/gameSession/actions";

type UseGameSessionOptions = {
  subscribe?: boolean;
};

export function useGameSession(
  gameId: string,
  options?: UseGameSessionOptions
) {
  const [gameStatus, setGameStatus] =
    useState<GameRoom["game_status"]>("not_started");

  // Subscribe to games row updates for status (and future phase if added)
  useEffect(() => {
    if (!gameId || options?.subscribe === false) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`game_session_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload: any) => {
          const next = payload?.new?.game_status as GameRoom["game_status"];
          if (next) setGameStatus(next);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, options?.subscribe]);

  const startGame = useCallback(async () => {
    if (!gameId) return { ok: false as const, message: "Missing gameId" };
    return await startGameAction(gameId);
  }, [gameId]);

  return {
    gameStatus,
    startGame,
  } as const;
}
