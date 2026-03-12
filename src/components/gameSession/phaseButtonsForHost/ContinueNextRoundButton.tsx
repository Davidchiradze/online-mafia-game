"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { startNight } from "@/lib/nightPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type ContinueNextRoundButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to continue to the next round (back to night phase).
 * This increments the night number and creates a new night_phase_sessions row.
 */
const ContinueNextRoundButton = ({
  gameSessionState,
}: ContinueNextRoundButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleContinueNextRound = async () => {
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
          nominatedPlayers: [], // Reset nominations
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleContinueNextRound}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default ContinueNextRoundButton;
