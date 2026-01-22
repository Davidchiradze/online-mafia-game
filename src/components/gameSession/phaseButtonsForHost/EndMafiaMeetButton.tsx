"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndMafiaMeetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the mafia meeting phase
 */
const EndMafiaMeetButton = ({ gameSessionState }: EndMafiaMeetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndMafiaMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to don_chooses_right_hand phase
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[3], // "don_chooses_right_hand"
      });
      if (!res?.ok) {
        console.error("Failed to end mafia meeting:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleEndMafiaMeet}
    >
      {isLoading ? "Ending..." : "End Mafia Meeting"}
    </button>
  );
};

export default EndMafiaMeetButton;
