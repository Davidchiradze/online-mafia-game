"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { resetSpeakingState } from "@/lib/dayPhase/actions";
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

      await resetSpeakingState(gameId);
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDoctorMeet} isLoading={isLoading} />;
};

export default EndDoctorMeetButton;
