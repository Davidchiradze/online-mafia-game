"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
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
        updates: advanceUpdates("detective_checks_for_mafia"),
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
