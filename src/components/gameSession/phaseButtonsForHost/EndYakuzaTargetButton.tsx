"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndYakuzaTargetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end yakuza and shogun target selection
 */
const EndYakuzaTargetButton = ({
  gameSessionState,
}: EndYakuzaTargetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndYakuzaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[13], // "detective_checks_for_mafia"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndYakuzaTarget} isLoading={isLoading} label="End Yakuza Phase" variant="danger" />;
};

export default EndYakuzaTargetButton;
