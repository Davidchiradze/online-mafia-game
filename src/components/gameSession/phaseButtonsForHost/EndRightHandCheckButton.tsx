"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndRightHandCheckButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end right hand's yakuza check
 */
const EndRightHandCheckButton = ({
  gameSessionState,
}: EndRightHandCheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndRightHandCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to yakuza_and_shogun_chooses_target phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[12], // "yakuza_and_shogun_chooses_target"
      });
      if (!res?.ok) {
        console.error("Failed to end right hand's check:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleEndRightHandCheck}
    >
      {isLoading ? "Ending..." : "End Right Hand's Check"}
    </button>
  );
};

export default EndRightHandCheckButton;
