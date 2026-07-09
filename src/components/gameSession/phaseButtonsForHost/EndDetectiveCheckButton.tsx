"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDetectiveCheckButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end detective's mafia check
 */
const EndDetectiveCheckButton = ({
  gameSessionState,
}: EndDetectiveCheckButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndDetectiveCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[21], // "phase_transition" (neutral sleep buffer)
          nextPhase: GAME_PHASES[14], // "doctor_heals_player"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton onClick={handleEndDetectiveCheck} isLoading={isLoading} label={t("endDetectiveCheck")} variant="primary" />
  );
};

export default EndDetectiveCheckButton;
