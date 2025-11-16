"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameRoom, GameSessionState } from "@/types/game/type";
import {
  createGameSession,
  getGameSession,
  startGame as startGameAction,
  updateGameSession,
} from "@/lib/gameSession/actions";

export function useGameSession(gameId: string, userId: string) {
  const [gameSessionState, setGameSessionState] =
    useState<GameSessionState | null>(null);

  // Subscribe to games row updates for status (and future phase if added)
  useEffect(() => {
    if (!gameId) return;
    const supabase = createClient();

    // Single channel for both INSERT and UPDATE events
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
        (payload: any) => {
          console.log("🔵 [INSERT] Game Session:", payload);
          const next = payload?.new as GameSessionState;
          if (next) setGameSessionState(next);
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
        (payload: any) => {
          console.log("🟢 [UPDATE] Game Session:", payload);
          const next = payload?.new as GameSessionState;
          if (next) setGameSessionState(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    const getGameSessionFunc = async () => {
      const res = await getGameSession(gameId, userId);
      if (!res?.ok) return;
      setGameSessionState({
        ...res?.gameSessionState,
        playerData: res?.playerData,
      });
    };
    getGameSessionFunc();
  }, [gameId]);

  const startGame = useCallback(async () => {
    if (!gameId) return { ok: false as const, message: "Missing gameId" };
    const res = await startGameAction(gameId);
    if (!res?.ok) return { ok: false as const, message: res?.message };
    const res2 = await createGameSession(gameId);
    if (!res2?.ok) return { ok: false as const, message: res2?.message };
    return { ok: true as const, gameSessionState };
  }, [gameId]);

  return {
    gameSessionState,
    startGame,
  } as const;
}
