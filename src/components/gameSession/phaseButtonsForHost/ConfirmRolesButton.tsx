"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type ConfirmRolesButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to confirm role assignments and move to mafia_meet phase
 */
const ConfirmRolesButton = ({ gameSessionState }: ConfirmRolesButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleConfirmRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[2], // "mafia_meet"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleConfirmRoles} isLoading={isLoading} />;
};

export default ConfirmRolesButton;
