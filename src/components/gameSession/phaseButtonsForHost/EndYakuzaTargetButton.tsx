"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndYakuzaTargetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end yakuza and shogun target selection
 */
const EndYakuzaTargetButton = ({
  gameSessionState,
}: EndYakuzaTargetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndYakuzaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Store yakuza target in attempt_to_kill_players array
      // Update game session to detective_checks_for_mafia phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[13], // "detective_checks_for_mafia"
      });
      if (!res?.ok) {
        console.error("Failed to end yakuza target selection:", res?.message);
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
      onClick={handleEndYakuzaTarget}
    >
      {isLoading ? "Ending..." : "End Yakuza & Shogun Target"}
    </button>
  );
};

export default EndYakuzaTargetButton;
