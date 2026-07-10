"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndYakuzaShogunMeetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end the yakuza and shogun meeting phase
 */
const EndYakuzaShogunMeetButton = ({
  gameSessionState,
}: EndYakuzaShogunMeetButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndYakuzaShogunMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[21], // "phase_transition" (neutral sleep buffer)
          nextPhase: GAME_PHASES[5], // "detective_meet"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton onClick={handleEndYakuzaShogunMeet} isLoading={isLoading} label={t("endMeeting")} variant="danger" />
  );
};

export default EndYakuzaShogunMeetButton;
