"use client";

import React, { useMemo, useState } from "react";
import { startGame, createGameSession } from "@/lib/gameSession/actions";
import { useTracks } from "@livekit/components-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";

/**
 * Button to start the game session
 * Handles game initialization and session creation
 */
const StartGameButton = () => {
  const tracks = useTracks();
  const { maxPlayers, gameId } = useGameRoom();

  const [isLoading, setIsLoading] = useState(false);
  const { readyCount, totalPlayers, allReady } = useMemo(() => {
    const nonHostTracks = tracks.filter((t) => !t?.participant?.isLocal);
    const total = nonHostTracks.length;
    const ready = nonHostTracks.filter((t) => {
      const p = t?.participant;
      try {
        return Boolean(JSON.parse(p?.metadata || "{}")?.ready);
      } catch {
        return false;
      }
    }).length;
    return {
      readyCount: ready,
      totalPlayers: total,
      allReady:
        maxPlayers !== null && total >= maxPlayers && ready >= maxPlayers,
    };
  }, [tracks, maxPlayers]);

  const handleStartGame = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Start the game first
      const res = await startGame(gameId);
      if (!res?.ok) {
        console.error("Failed to start game:", res?.message);
        return;
      }

      // Create game session
      const sessionRes = await createGameSession(gameId);
      if (!sessionRes?.ok) {
        console.error("Failed to create game session:", sessionRes?.message);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return allReady ? (
    <button
      type="button"
      className="rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleStartGame}
    >
      {isLoading ? "Starting..." : "Start Game"}
    </button>
  ) : (
    <div className="text-xs text-gray-300/80">
      {readyCount}/{maxPlayers} ready
    </div>
  );
};

export default StartGameButton;
