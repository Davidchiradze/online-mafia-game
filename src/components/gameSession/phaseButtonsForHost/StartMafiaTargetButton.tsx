"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type StartMafiaTargetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start mafia target selection.
 * If coming from night_phase (night already started), just transitions.
 * If current_night_number is 0, starts a new night first.
 */
const StartMafiaTargetButton = ({
  gameSessionState,
}: StartMafiaTargetButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // If current_night_number is 0, we need to start the night first
      if (
        !gameSessionState.current_night_number ||
        gameSessionState.current_night_number === 0
      ) {
        const nightRes = await startNight(gameId);
        if (!nightRes.ok) {
          console.error("Failed to start night:", nightRes.message);
          return;
        }
      }

      // Update game session to mafia_chooses_target phase
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[9], // "mafia_chooses_target"
      });
      if (!res?.ok) {
        console.error("Failed to start mafia target selection:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleStartMafiaTarget}
    >
      {isLoading ? "Starting..." : "Mafia Choose Target"}
    </button>
  );
};

export default StartMafiaTargetButton;
