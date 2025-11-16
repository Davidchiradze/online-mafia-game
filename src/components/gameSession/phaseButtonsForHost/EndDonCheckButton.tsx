"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndDonCheckButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end don's detective check
 */
const EndDonCheckButton = ({ gameSessionState }: EndDonCheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDonCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to right_hand_checks_for_yakuza phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[11], // "right_hand_checks_for_yakuza"
      });
      if (!res?.ok) {
        console.error("Failed to end don's check:", res?.message);
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
      onClick={handleEndDonCheck}
    >
      {isLoading ? "Ending..." : "End Don's Check"}
    </button>
  );
};

export default EndDonCheckButton;
