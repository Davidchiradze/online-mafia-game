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

export function useGameSession(gameId: string, userId: string) {
  const [gameSessionState, setGameSessionState] =
    useState<GameSessionState | null>(null);

  // Subscribe to game_sessions table updates
  useGameSessionListener(gameId, setGameSessionState);

  // Subscribe to game_players table updates for current user
  useGamePlayerListener(gameId, userId, setGameSessionState);

  useEffect(() => {
    if (!gameId) return;
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
  }, [gameId, userId]);

  const startGame = useCallback(async () => {
    if (!gameId) return { ok: false as const, message: "Missing gameId" };
    const res = await startGameAction(gameId);
    if (!res?.ok) return { ok: false as const, message: res?.message };
    const res2 = await createGameSession(gameId);
    if (!res2?.ok) return { ok: false as const, message: res2?.message };
    return { ok: true as const, gameSessionState };
  }, [gameId, gameSessionState]);

  return {
    gameSessionState,
    startGame,
  } as const;
}
