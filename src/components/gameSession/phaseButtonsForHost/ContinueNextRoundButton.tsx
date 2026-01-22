"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type ContinueNextRoundButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to continue to the next round (back to night phase).
 * This increments the night number and creates a new night_phase_sessions row.
 */
const ContinueNextRoundButton = ({
  gameSessionState,
}: ContinueNextRoundButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinueNextRound = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Start a new night (increments night number, creates night_phase_sessions row)
      const nightRes = await startNight(gameId);
      if (!nightRes.ok) {
        console.error("Failed to start night:", nightRes.message);
        return;
      }

      // Update game session back to night_phase for next round (startNight already set current_night_number)
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[8], // "night_phase"
        nominated_players: [], // Reset nominations
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
