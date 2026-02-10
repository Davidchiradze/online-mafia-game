"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type ConfirmRolesButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to confirm role assignments and move to mafia_meet phase
 */
const ConfirmRolesButton = ({ gameSessionState }: ConfirmRolesButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[2], // "mafia_meet"
      });
      if (!res?.ok) {
        console.error("Failed to confirm roles:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleConfirmRoles} isLoading={isLoading} />;
};

export default ConfirmRolesButton;
