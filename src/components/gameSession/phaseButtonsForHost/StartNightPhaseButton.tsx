"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { startNight } from "@/lib/nightPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type StartNightPhaseButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to start the night phase after introduction.
 * This increments the night number and creates a new night_phase_sessions row.
 */
const StartNightPhaseButton = ({
  gameSessionState,
}: StartNightPhaseButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleStartNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nightRes = await startNight(gameId);
      if (!nightRes.ok) {
        console.error("Failed to start night:", nightRes.message);
        return;
      }

      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[8], // "night_phase"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartNightPhase}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default StartNightPhaseButton;
