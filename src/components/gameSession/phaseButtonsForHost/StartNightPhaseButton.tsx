"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
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
  const startNightMutation = useMutation(nightPhase.startNight);

  const handleStartNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startNightMutation({ gameId: gameId as Id<"games"> });

      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[8], // "night_phase"
        },
      });
    } catch (error) {
      console.error("Failed to start night phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartNightPhase}
      isLoading={isLoading}
      label="Start Night"
      variant="secondary"
    />
  );
};

export default StartNightPhaseButton;
