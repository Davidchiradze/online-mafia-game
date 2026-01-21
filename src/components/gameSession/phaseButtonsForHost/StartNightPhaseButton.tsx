"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type StartNightPhaseButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start the night phase after introduction.
 * This increments the night number and creates a new night_phase_sessions row.
 */
const StartNightPhaseButton = ({
  gameSessionState,
}: StartNightPhaseButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Start a new night (increments night number, creates night_phase_sessions row)
      const nightRes = await startNight(gameId);
      if (!nightRes.ok) {
        console.error("Failed to start night:", nightRes.message);
        return;
      }

      // Update game session to night_phase (startNight already set current_night_number)
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[8], // "night_phase"
      });
      if (!res?.ok) {
        console.error("Failed to start night phase:", res?.message);
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
      onClick={handleStartNightPhase}
    >
      {isLoading ? "Starting..." : "Start Night Phase"}
    </button>
  );
};

export default StartNightPhaseButton;
