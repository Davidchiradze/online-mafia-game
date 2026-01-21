"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

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
      // TODO: Validate that all roles are assigned
      // Update game session to mafia_meet phase
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

  return (
    <button
      type="button"
      className="rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleConfirmRoles}
    >
      {isLoading ? "Processing..." : "Confirm Roles"}
    </button>
  );
};

export default ConfirmRolesButton;
