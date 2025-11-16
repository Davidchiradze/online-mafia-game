"use client";

import React, { useState } from "react";
import { startGame, createGameSession } from "@/lib/gameSession/actions";

type StartGameButtonProps = {
  gameId: string;
};

/**
 * Button to start the game session
 * Handles game initialization and session creation
 */
const StartGameButton = ({ gameId }: StartGameButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <button
      type="button"
      className="rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleStartGame}
    >
      {isLoading ? "Starting..." : "Start Game"}
    </button>
  );
};

export default StartGameButton;
