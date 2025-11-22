"use client";

import React, { useState } from "react";
import {
  updateGameSession,
  assignRandomRoles,
} from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

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
      // Assign random roles to all 12 players
      const assignRes = await assignRandomRoles(gameSessionState.game_id);
      if (!assignRes?.ok) {
        console.error("Failed to assign roles:", assignRes?.message);
        alert(`Failed to assign roles: ${assignRes?.message}`);
        return;
      }

      // Update game session to picking_roles phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
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
    <button
      type="button"
      className="rounded-md bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleStartPickingRoles}
    >
      {isLoading ? "Assigning Roles..." : "Start Picking Roles"}
    </button>
  );
};

export default StartPickingRolesButton;
