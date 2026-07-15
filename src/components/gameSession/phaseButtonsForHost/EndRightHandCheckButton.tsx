"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
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
        updates: advanceUpdates("right_hand_checks_for_yakuza"),
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
