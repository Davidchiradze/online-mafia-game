"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndDetectiveCheckButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end detective's mafia check
 */
const EndDetectiveCheckButton = ({
  gameSessionState,
}: EndDetectiveCheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDetectiveCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to doctor_heals_player phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[14], // "doctor_heals_player"
      });
      if (!res?.ok) {
        console.error("Failed to end detective's check:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleEndDetectiveCheck}
    >
      {isLoading ? "Ending..." : "End Detective's Check"}
    </button>
  );
};

export default EndDetectiveCheckButton;
