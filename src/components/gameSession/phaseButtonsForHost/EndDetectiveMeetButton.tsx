"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndDetectiveMeetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the detective meeting phase
 */
const EndDetectiveMeetButton = ({
  gameSessionState,
}: EndDetectiveMeetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDetectiveMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to doctor_meet phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[6], // "doctor_meet"
      });
      if (!res?.ok) {
        console.error("Failed to end detective meeting:", res?.message);
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
      onClick={handleEndDetectiveMeet}
    >
      {isLoading ? "Ending..." : "End Detective Meeting"}
    </button>
  );
};

export default EndDetectiveMeetButton;
