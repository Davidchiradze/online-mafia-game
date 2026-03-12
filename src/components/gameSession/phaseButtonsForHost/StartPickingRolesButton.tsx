"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { assignRandomRoles } from "@/lib/gameSession/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type StartPickingRolesButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to start the role picking phase and assign random roles to all players
 */
const StartPickingRolesButton = ({
  gameSessionState,
}: StartPickingRolesButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleStartPickingRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const assignRes = await assignRandomRoles(gameSessionState.gameId);
      if (!assignRes?.ok) {
        console.error("Failed to assign roles:", assignRes?.message);
        alert(`Failed to assign roles: ${assignRes?.message}`);
        return;
      }

      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[1], // "picking_roles"
        },
      });
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
