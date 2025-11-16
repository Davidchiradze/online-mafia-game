"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";

type StartPickingRolesButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start the role picking phase
 */
const StartPickingRolesButton = ({
  gameSessionState,
}: StartPickingRolesButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartPickingRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Update game session to picking_roles phase
      const res = await updateGameSession(gameSessionState.id, {
        ...gameSessionState,
        game_phase: GAME_PHASES[1], // "picking_roles"
      });
      if (!res?.ok) {
        console.error("Failed to start picking roles:", res?.message);
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
      {isLoading ? "Starting..." : "Start Picking Roles"}
    </button>
  );
};

export default StartPickingRolesButton;
