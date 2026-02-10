"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

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
      const res = await updateGameSession(gameSessionState.id, {
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
    <PhaseButton onClick={handleEndDetectiveMeet} isLoading={isLoading} />
  );
};

export default EndDetectiveMeetButton;
