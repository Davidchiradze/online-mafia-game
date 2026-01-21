"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndYakuzaShogunMeetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the yakuza and shogun meeting phase
 */
const EndYakuzaShogunMeetButton = ({
  gameSessionState,
}: EndYakuzaShogunMeetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndYakuzaShogunMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to detective_meet phase
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[5], // "detective_meet"
      });
      if (!res?.ok) {
        console.error("Failed to end yakuza/shogun meeting:", res?.message);
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
      onClick={handleEndYakuzaShogunMeet}
    >
      {isLoading ? "Ending..." : "End Yakuza & Shogun Meeting"}
    </button>
  );
};

export default EndYakuzaShogunMeetButton;
