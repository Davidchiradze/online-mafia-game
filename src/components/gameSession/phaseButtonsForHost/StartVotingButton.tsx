"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type StartVotingButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start voting phase during day
 */
const StartVotingButton = ({ gameSessionState }: StartVotingButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartVoting = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to voting phase
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[18], // "voting"
      });
      if (!res?.ok) {
        console.error("Failed to start voting:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleStartVoting}
    >
      {isLoading ? "Starting..." : "Start Voting Phase"}
    </button>
  );
};

export default StartVotingButton;
