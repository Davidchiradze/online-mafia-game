"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

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
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[10], // "don_checks_for_detective"
      });
      if (!res?.ok) {
        console.error("Failed to end mafia target selection:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndMafiaTarget} isLoading={isLoading} />;
};

export default EndMafiaTargetButton;
