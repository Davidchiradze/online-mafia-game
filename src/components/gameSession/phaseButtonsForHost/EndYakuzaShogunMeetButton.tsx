"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

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
    <PhaseButton onClick={handleEndYakuzaShogunMeet} isLoading={isLoading} />
  );
};

export default EndYakuzaShogunMeetButton;
