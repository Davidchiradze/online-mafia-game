"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDetectiveMeetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end the detective meeting phase
 */
const EndDetectiveMeetButton = ({
  gameSessionState,
}: EndDetectiveMeetButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndDetectiveMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: advanceUpdates("detective_meet"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton onClick={handleEndDetectiveMeet} isLoading={isLoading} label={t("endMeeting")} variant="danger" />
  );
};

export default EndDetectiveMeetButton;
