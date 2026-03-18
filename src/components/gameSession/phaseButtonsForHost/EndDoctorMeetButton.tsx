"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDoctorMeetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end the doctor meeting phase
 */
const EndDoctorMeetButton = ({
  gameSessionState,
}: EndDoctorMeetButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const resetSpeakingState = useMutation(dayPhase.resetSpeakingState);

  const handleEndDoctorMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[7], // "introduction_phase"
        },
      });

      await resetSpeakingState({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDoctorMeet} isLoading={isLoading} />;
};

export default EndDoctorMeetButton;
