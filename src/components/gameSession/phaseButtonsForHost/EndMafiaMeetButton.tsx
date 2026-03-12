"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndMafiaMeetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end the mafia meeting phase
 */
const EndMafiaMeetButton = ({ gameSessionState }: EndMafiaMeetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndMafiaMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[3], // "don_chooses_right_hand"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndMafiaMeet} isLoading={isLoading} />;
};

export default EndMafiaMeetButton;
