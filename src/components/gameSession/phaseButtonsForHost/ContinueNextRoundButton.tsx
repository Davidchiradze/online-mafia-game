"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type ContinueNextRoundButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to continue to the next round (back to night phase)
 */
const ContinueNextRoundButton = ({
  gameSessionState,
}: ContinueNextRoundButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleContinueNextRound = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Reset round-specific state
      // Update game session back to night_phase for next round
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[8], // "night_phase"
        nominatedPlayers: [], // Reset nominations
      });
      if (!res?.ok) {
        console.error("Failed to continue to next round:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleContinueNextRound}
    >
      {isLoading ? "Continuing..." : "Continue to Next Round"}
    </button>
  );
};

export default ContinueNextRoundButton;
