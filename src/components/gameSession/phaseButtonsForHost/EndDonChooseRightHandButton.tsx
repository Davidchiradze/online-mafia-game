"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDonChooseRightHandButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the don's right hand selection phase
 */
const EndDonChooseRightHandButton = ({
  gameSessionState,
}: EndDonChooseRightHandButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDonChoice = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[4], // "yakuda_shogun_meet"
      });
      if (!res?.ok) {
        console.error("Failed to end don's choice:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDonChoice} isLoading={isLoading} />;
};

export default EndDonChooseRightHandButton;
