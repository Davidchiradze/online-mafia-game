"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type StartPickingRolesButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

const StartPickingRolesButton = ({
  gameSessionState,
}: StartPickingRolesButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const assignRoles = useMutation(gameSessions.assignRandomRoles);
  const updateSession = useMutation(gameSessions.update);

  const handleStartPickingRoles = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await assignRoles({ gameId: gameSessionState.gameId as Id<"games"> });

      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[1],
        },
      });
    } catch (error) {
      console.error("Failed to assign roles:", error);
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
