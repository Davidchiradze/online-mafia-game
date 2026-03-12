"use client";

import React, { useState } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { startFarewellSpeech } from "@/lib/farewellSpeech/actions";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDoctorHealButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end doctor's heal action and transition to farewell speech phase.
 *
 * Flow:
 * - Calls startFarewellSpeech which:
 *   - Determines who was killed (mafia_target, yakuza_target) minus healed player
 *   - If no one dies, skips directly to day_phase
 *   - Otherwise, transitions to farewell_speech with randomized speaker order
 */
const EndDoctorHealButton = ({
  gameSessionState,
}: EndDoctorHealButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleEndDoctorHeal = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await startFarewellSpeech(gameId);

      if (!result.ok) {
        console.error("Failed to start farewell speech:", result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDoctorHeal} isLoading={isLoading} />;
};

export default EndDoctorHealButton;
