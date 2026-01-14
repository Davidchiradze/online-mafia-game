"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndVotingButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end voting and process results
 */
const EndVotingButton = ({ gameSessionState }: EndVotingButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndVoting = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Process voting results and eliminate player
      // TODO: Check win conditions
      // Update game session to repeat or end_game phase and clear nominations
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[17], // "repeat"
        nominated_players: [], // Clear nominations after voting phase ends
      });
      if (!res?.ok) {
        console.error("Failed to end voting:", res?.message);
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
      onClick={handleEndVoting}
    >
      {isLoading ? "Ending..." : "End Voting"}
    </button>
  );
};

export default EndVotingButton;
