"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndRightHandCheckButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end right hand's yakuza check
 */
const EndRightHandCheckButton = ({
  gameSessionState,
}: EndRightHandCheckButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndRightHandCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[12], // "yakuza_and_shogun_chooses_target"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton onClick={handleEndRightHandCheck} isLoading={isLoading} label={t("endCheck")} variant="primary" />
  );
};

export default EndRightHandCheckButton;
