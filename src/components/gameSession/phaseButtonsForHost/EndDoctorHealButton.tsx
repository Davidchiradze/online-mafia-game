"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { resetSpeakingState } from "@/lib/dayPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type EndDoctorHealButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end doctor's heal action
 */
const EndDoctorHealButton = ({
  gameSessionState,
}: EndDoctorHealButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDoctorHeal = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Store healed player in healed_players array
      // Update game session to day_phase
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[15], // "day_phase"
      });

      // Reset speaking state for new day phase
      await resetSpeakingState(gameId);
      if (!res?.ok) {
        console.error("Failed to end doctor's heal:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleEndDoctorHeal}
    >
      {isLoading ? "Ending..." : "End Doctor's Heal"}
    </button>
  );
};

export default EndDoctorHealButton;
