"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type StartMafiaTargetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start mafia target selection
 */
const StartMafiaTargetButton = ({
  gameSessionState,
}: StartMafiaTargetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to mafia_chooses_target phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
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
