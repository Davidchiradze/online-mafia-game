"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

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
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[13], // "detective_checks_for_mafia"
      });
      if (!res?.ok) {
        console.error("Failed to end yakuza target selection:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndYakuzaTarget} isLoading={isLoading} />;
};

export default EndYakuzaTargetButton;
