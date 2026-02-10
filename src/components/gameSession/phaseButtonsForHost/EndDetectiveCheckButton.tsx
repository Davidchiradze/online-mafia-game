"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDetectiveCheckButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end detective's mafia check
 */
const EndDetectiveCheckButton = ({
  gameSessionState,
}: EndDetectiveCheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDetectiveCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[14], // "doctor_heals_player"
      });
      if (!res?.ok) {
        console.error("Failed to end detective's check:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton onClick={handleEndDetectiveCheck} isLoading={isLoading} />
  );
};

export default EndDetectiveCheckButton;
