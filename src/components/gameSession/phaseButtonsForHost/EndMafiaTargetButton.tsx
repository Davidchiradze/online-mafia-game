"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndMafiaTargetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end mafia target selection
 */
const EndMafiaTargetButton = ({
  gameSessionState,
}: EndMafiaTargetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Store selected target in attempt_to_kill_players array
      // Update game session to don_checks_for_detective phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[10], // "don_checks_for_detective"
      });
      if (!res?.ok) {
        console.error("Failed to end mafia target selection:", res?.message);
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
      onClick={handleEndMafiaTarget}
    >
      {isLoading ? "Ending..." : "End Mafia Target Selection"}
    </button>
  );
};

export default EndMafiaTargetButton;
