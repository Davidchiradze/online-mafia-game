"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type EndDoctorMeetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the doctor meeting phase
 */
const EndDoctorMeetButton = ({
  gameSessionState,
}: EndDoctorMeetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDoctorMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to introduction_phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[7], // "introduction_phase"
      });
      if (!res?.ok) {
        console.error("Failed to end doctor meeting:", res?.message);
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
      onClick={handleEndDoctorMeet}
    >
      {isLoading ? "Ending..." : "End Doctor Meeting"}
    </button>
  );
};

export default EndDoctorMeetButton;
