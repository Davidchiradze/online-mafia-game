"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { resetSpeakingState } from "@/lib/dayPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDoctorMeetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the doctor meeting phase
 */
const EndDoctorMeetButton = ({
  gameSessionState,
}: EndDoctorMeetButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDoctorMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[7], // "introduction_phase"
      });

      await resetSpeakingState(gameId);
      if (!res?.ok) {
        console.error("Failed to end doctor meeting:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDoctorMeet} isLoading={isLoading} />;
};

export default EndDoctorMeetButton;
