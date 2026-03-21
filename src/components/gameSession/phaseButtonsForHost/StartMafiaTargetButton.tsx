"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type StartMafiaTargetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to start mafia target selection.
 * If coming from night_phase (night already started), just transitions.
 * If currentNightNumber is 0, starts a new night first.
 */
const StartMafiaTargetButton = ({
  gameSessionState,
}: StartMafiaTargetButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const startNightMutation = useMutation(nightPhase.startNight);

  const handleStartMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (
        !gameSessionState.currentNightNumber ||
        gameSessionState.currentNightNumber === 0
      ) {
        await startNightMutation({ gameId: gameId as Id<"games"> });
      }

      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[9], // "mafia_chooses_target"
        },
      });
    } catch (error) {
      console.error("Failed to start mafia target:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartMafiaTarget}
      isLoading={isLoading}
      label="Start Mafia Phase"
      variant="danger"
    />
  );
};

export default StartMafiaTargetButton;
