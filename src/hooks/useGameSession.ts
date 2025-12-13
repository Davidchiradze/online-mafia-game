"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameSessionState } from "@/types/game/type";
import {
  createGameSession,
  getGameSession,
  startGame as startGameAction,
} from "@/lib/gameSession/actions";
import { useGameSessionListener } from "./useGameSessionListener";
import { useGamePlayerListener } from "./useGamePlayerListener";

export function useGameSession(
  gameId: string,
  userId: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const [gameSessionState, setGameSessionState] =
    useState<GameSessionState | null>(null);

  // Subscribe to game_sessions table updates
  useGameSessionListener(gameId, setGameSessionState, enabled);

  // Subscribe to game_players table updates for current user
  useGamePlayerListener(gameId, userId, setGameSessionState, enabled);

  useEffect(() => {
    if (!gameId || !enabled) return;
    const getGameSessionFunc = async () => {
      const res = await getGameSession(gameId, userId);
      if (!res?.ok) return;
      setGameSessionState({
        ...res?.gameSessionState,
        playerData: res?.playerData,
        allPlayers: res?.allPlayers,
      });
    };
    getGameSessionFunc();
  }, [enabled, gameId, userId, gameSessionState?.game_phase]);

  const startGame = useCallback(async () => {
    if (!enabled || !gameId)
      return { ok: false as const, message: "Missing gameId" };
    const res = await startGameAction(gameId);
    if (!res?.ok) return { ok: false as const, message: res?.message };
    const res2 = await createGameSession(gameId);
    if (!res2?.ok) return { ok: false as const, message: res2?.message };
    return { ok: true as const, gameSessionState };
  }, [gameId, gameSessionState]);

  return {
    gameSessionState,
    setGameSessionState,
    startGame,
  } as const;
}
