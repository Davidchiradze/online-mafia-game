"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndDonChooseRightHandButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the don's right hand selection phase
 */
const EndDonChooseRightHandButton = ({
  gameSessionState,
}: EndDonChooseRightHandButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDonChoice = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to yakuda_shogun_meet phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[4], // "yakuda_shogun_meet"
      });
      if (!res?.ok) {
        console.error("Failed to end don's choice:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleEndDonChoice}
    >
      {isLoading ? "Ending..." : "End Don's Choice"}
    </button>
  );
};

export default EndDonChooseRightHandButton;
