"use client";

import React, { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";
import PhaseTitle from "@/components/ui/PhaseTitle";

/**
 * Button to start the game session.
 * Shows ready count while not everyone is ready.
 * Shows title + "Start" button once every player currently in the lobby
 * (excluding the host) has marked themselves ready.
 *
 * Ready state is read from the reactive `players` query (gamePlayers.isReady),
 * not from LiveKit metadata.
 */
const StartGameButton = () => {
  const { gameId, players, hostUserId } = useGameRoom();
  const startGameMutation = useMutation(gameSessions.startGame);

  const [isLoading, setIsLoading] = useState(false);

  const { readyCount, totalPlayers, allReady } = useMemo(() => {
    const lobbyPlayers = players.filter((p) => p.playerId !== hostUserId);
    const total = lobbyPlayers.length;
    const ready = lobbyPlayers.filter((p) => p.isReady).length;
    return {
      readyCount: ready,
      totalPlayers: total,
      allReady: total > 0 && ready === total,
    };
  }, [players, hostUserId]);

  const handleStartGame = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startGameMutation({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return allReady ? (
    <div className="flex flex-col items-center gap-2">
      <PhaseTitle title="Ready to Play" />
      <PhaseButton onClick={handleStartGame} isLoading={isLoading} label="Start" variant="success" />
    </div>
  ) : (
    <div className="text-xs text-white/50">
      {readyCount}/{totalPlayers} ready
    </div>
  );
};

export default StartGameButton;
