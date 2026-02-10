"use client";

import React, { useState } from "react";
import {
  updateGameSession,
  assignRandomRoles,
} from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type StartPickingRolesButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start the role picking phase and assign random roles to all players
 */
const StartPickingRolesButton = ({
  gameSessionState,
}: StartPickingRolesButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartPickingRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const assignRes = await assignRandomRoles(gameSessionState.game_id);
      if (!assignRes?.ok) {
        console.error("Failed to assign roles:", assignRes?.message);
        alert(`Failed to assign roles: ${assignRes?.message}`);
        return;
      }

      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[1], // "picking_roles"
      });
      if (!res?.ok) {
        console.error("Failed to start picking roles:", res?.message);
        alert(`Failed to start picking roles: ${res?.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartPickingRoles}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default StartPickingRolesButton;
