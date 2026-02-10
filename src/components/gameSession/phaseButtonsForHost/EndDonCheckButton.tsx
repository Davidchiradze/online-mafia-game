"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDonCheckButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end don's detective check
 */
const EndDonCheckButton = ({ gameSessionState }: EndDonCheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDonCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[11], // "right_hand_checks_for_yakuza"
      });
      if (!res?.ok) {
        console.error("Failed to end don's check:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDonCheck} isLoading={isLoading} />;
};

export default EndDonCheckButton;
